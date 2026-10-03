import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { z } from "zod";
import {
  postFileSchema,
  slugSchema,
  type FilePost,
  type FilePostSummary,
} from "./post-file";

export const INDEX_PATH = "content/post-index.json";
// 압축 해제 후에도 Next.js 캐시 항목당 크기 제한을 넘지 않도록 나눈다.
// GitHub Contents API의 본문 크기 제한에 맞춰 gzip·base64로 저장한다.
const CHUNK_BYTES = 750_000;
export const gitShaSchema = z.string().regex(/^[a-f0-9]{40}$/);
const chunkRefSchema = z.object({
  bucket: z.string().regex(/^[a-f0-9]$/),
  sha: gitShaSchema,
});
export const manifestSchema = z.object({
  version: z.literal(1),
  catalog: z.array(chunkRefSchema),
  search: z.array(chunkRefSchema),
});
export type IndexManifest = z.infer<typeof manifestSchema>;
type ChunkRef = z.infer<typeof chunkRefSchema>;
export const catalogSchema = z.array(
  z.object({
    post: postFileSchema.omit({ body: true }).extend({ excerpt: z.string() }),
    sha: gitShaSchema,
  }),
);
export type CatalogEntry = z.infer<typeof catalogSchema>[number];
export const searchSchema = z.array(
  z.object({ slug: slugSchema, text: z.string() }),
);
export type SearchDocument = z.infer<typeof searchSchema>[number];
export type IndexFile = { path: string; content: string };

export function blobSha(content: string) {
  const buffer = Buffer.from(content);
  return createHash("sha1")
    .update(`blob ${buffer.length}\0`)
    .update(buffer)
    .digest("hex");
}

export function indexBucket(slug: string) {
  return createHash("sha256").update(slug).digest("hex")[0];
}

export function summarize(post: FilePost, sha: string): CatalogEntry {
  const summary: FilePostSummary & { body?: string } = { ...post };
  delete summary.body;
  return { post: summary, sha };
}

export function searchDocument(post: FilePost): SearchDocument {
  return {
    slug: post.slug,
    text: [
      post.title,
      post.excerpt,
      post.body,
      post.category.name,
      ...post.tags,
    ]
      .join(" ")
      .toLocaleLowerCase(),
  };
}

export function chunkPath(kind: "catalog" | "search", sha: string) {
  return `content/index/${kind}-${gitShaSchema.parse(sha)}.gz.b64`;
}

export function decodeChunk(content: string): unknown {
  return JSON.parse(
    gunzipSync(Buffer.from(content, "base64"), {
      maxOutputLength: CHUNK_BYTES,
    }).toString("utf8"),
  );
}

export function buildChunks<T extends { slug: string } | CatalogEntry>(
  kind: "catalog" | "search",
  values: T[],
) {
  const groups = new Map<string, { slug: string; json: string }[]>();
  for (const value of values) {
    const slug = "post" in value ? value.post.slug : value.slug;
    const bucket = indexBucket(slug);
    const group = groups.get(bucket) ?? [];
    group.push({ slug, json: JSON.stringify(value) });
    groups.set(bucket, group);
  }
  const refs: ChunkRef[] = [];
  const files: IndexFile[] = [];
  function emit(bucket: string, json: string[]) {
    if (!json.length) return;
    const content = gzipSync(`[${json.join(",")}]`).toString("base64");
    const sha = blobSha(content);
    refs.push({ bucket, sha });
    files.push({ path: chunkPath(kind, sha), content });
  }
  for (const [bucket, group] of [...groups].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    group.sort((a, b) => a.slug.localeCompare(b.slug, "en"));
    let json: string[] = [];
    let bytes = 2;
    for (const value of group) {
      const size = Buffer.byteLength(value.json) + 1;
      if (size + 2 > CHUNK_BYTES)
        throw new Error(`Index entry too large: ${value.slug}`);
      if (bytes + size > CHUNK_BYTES) {
        emit(bucket, json);
        json = [];
        bytes = 2;
      }
      json.push(value.json);
      bytes += size;
    }
    emit(bucket, json);
  }
  return { refs, files };
}

export function assertUniquePosts(entries: CatalogEntry[]) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const { post } of entries) {
    if (ids.has(post.id) || slugs.has(post.slug))
      throw new Error(`Duplicate post ID or slug: ${post.slug}`);
    ids.add(post.id);
    slugs.add(post.slug);
  }
}
