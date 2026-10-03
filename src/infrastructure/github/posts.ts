import "server-only";

import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { withCommentCounts } from "./comment-counts";
import { getCategoryNavigation } from "@/config/site";
import { createExcerpt } from "@/lib/content/excerpt";
import {
  pinnedPosts,
  pinnedOrderSchema,
  type PinnedOrder,
  type PinnedPost,
  samePinnedOrder,
} from "@/domain/pinned-posts";
import {
  parsePostFile,
  serializePostFile,
  slugSchema,
  postFieldsSchema,
  type FilePost,
} from "@/lib/content/post-file";
import {
  INDEX_PATH,
  manifestSchema,
  catalogSchema,
  searchSchema,
  gitShaSchema,
  blobSha,
  summarize,
  searchDocument,
  indexBucket,
  buildChunks,
  chunkPath,
  decodeChunk,
  assertUniquePosts,
  type IndexManifest,
  type CatalogEntry,
  type SearchDocument,
  type IndexFile,
} from "@/lib/content/post-index";

export class PostStoreError extends Error {
  constructor(
    message: string,
    public status: number,
    public conflict?: { kind: "pinned"; posts: PinnedPost[] },
  ) {
    super(message);
  }
}

export function usesGitHubStorage() {
  return process.env.CONTENT_SOURCE === "github";
}
function localPostsPath(...segments: string[]) {
  return path.resolve(
    process.env.LOCAL_CONTENT_PATH ?? "content/posts",
    ...segments,
  );
}
function config() {
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_CONTENT_BRANCH, GITHUB_TOKEN } =
    process.env;
  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_CONTENT_BRANCH || !GITHUB_TOKEN)
    throw new PostStoreError(
      "GitHub 저장소와 콘텐츠 브랜치 설정이 필요합니다.",
      503,
    );
  return {
    base: `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}`,
    branch: GITHUB_CONTENT_BRANCH,
    token: GITHUB_TOKEN,
  };
}
function branchPath() {
  return config().branch.split("/").map(encodeURIComponent).join("/");
}
async function request(endpoint: string, init: RequestInit = {}) {
  const { base, token } = config();
  const response = await fetch(`${base}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
    signal: init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
  });
  if (response.status === 409 || response.status === 422)
    throw new PostStoreError(
      "다른 변경이 먼저 저장되었습니다. 현재 내용을 보관하고 글을 다시 열어 주세요.",
      409,
    );
  if (!response.ok && response.status !== 404)
    throw new PostStoreError(
      "GitHub 저장소 요청에 실패했습니다. 권한과 연결을 확인해 주세요.",
      502,
    );
  return response;
}
async function gitJson(endpoint: string, init?: RequestInit) {
  const response = await request(endpoint, init);
  if (!response.ok)
    throw new PostStoreError("콘텐츠 브랜치를 찾을 수 없습니다.", 503);
  return response.json();
}
async function headRef() {
  const sha = (await gitJson(`/git/ref/heads/${branchPath()}`)).object?.sha;
  if (!gitShaSchema.safeParse(sha).success)
    throw new PostStoreError("콘텐츠 브랜치를 확인할 수 없습니다.", 502);
  return sha as string;
}
async function readContent(filePath: string, ref: string) {
  const response = await request(
    `/contents/${filePath}?ref=${encodeURIComponent(ref)}`,
  );
  if (response.status === 404) return null;
  const file = await response.json();
  if (file.type !== "file" || file.encoding !== "base64")
    throw new PostStoreError("지원하지 않는 콘텐츠 파일입니다.", 502);
  return {
    content: Buffer.from(file.content, "base64").toString("utf8"),
    sha: gitShaSchema.parse(file.sha),
  };
}
async function readBlob(sha: string) {
  const file = await gitJson(`/git/blobs/${gitShaSchema.parse(sha)}`);
  if (file.encoding !== "base64")
    throw new PostStoreError("콘텐츠를 읽을 수 없습니다.", 502);
  const content = Buffer.from(file.content, "base64").toString("utf8");
  if (blobSha(content) !== sha)
    throw new PostStoreError("콘텐츠 무결성 확인에 실패했습니다.", 502);
  return content;
}
async function batches<T, R>(
  values: T[],
  read: (value: T) => Promise<R>,
): Promise<R[]> {
  const result: R[] = [];
  for (let i = 0; i < values.length; i += 8)
    result.push(...(await Promise.all(values.slice(i, i + 8).map(read))));
  return result;
}
function sortCatalog(entries: CatalogEntry[]) {
  assertUniquePosts(entries);
  return entries.sort(
    (a, b) =>
      Date.parse(b.post.createdAt) - Date.parse(a.post.createdAt) ||
      a.post.slug.localeCompare(b.post.slug, "en", { numeric: true }),
  );
}

export async function getStoredPost(
  slug: string,
  ref?: string,
): Promise<{ post: FilePost; sha: string } | null> {
  if (!slugSchema.safeParse(slug).success) return null;
  if (!usesGitHubStorage()) {
    try {
      const content = await readFile(localPostsPath(`${slug}.md`), "utf8");
      return { post: parsePostFile(content, slug), sha: blobSha(content) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  const file = await readContent(
    `content/posts/${slug}.md`,
    ref ?? config().branch,
  );
  return file
    ? { post: parsePostFile(file.content, slug), sha: file.sha }
    : null;
}

async function readLocalPosts() {
  let names: string[];
  try {
    names = await readdir(localPostsPath());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return batches(
    names.filter((name) => name.endsWith(".md")),
    async (name) => {
      const slug = slugSchema.parse(name.slice(0, -3));
      const stored = await getStoredPost(slug);
      if (!stored)
        throw new PostStoreError(
          "목록이 변경되었습니다. 다시 시도해 주세요.",
          409,
        );
      return stored;
    },
  );
}
async function readManifest(ref: string) {
  const file = await readContent(INDEX_PATH, ref);
  return file ? manifestSchema.parse(JSON.parse(file.content)) : null;
}
const publicManifest = cache(async () => {
  if (!usesGitHubStorage()) return null;
  return cachedManifest();
});
async function cachedManifest(): Promise<IndexManifest> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag("posts");
  const manifest = await readManifest(config().branch);
  if (manifest) return manifest;
  await headRef();
  return { version: 1, catalog: [], search: [] };
}
async function readCatalogChunk(sha: string) {
  return catalogSchema.parse(decodeChunk(await readBlob(sha)));
}
async function readSearchChunk(sha: string) {
  return searchSchema.parse(decodeChunk(await readBlob(sha)));
}
async function publicCatalogChunk(sha: string) {
  "use cache";
  cacheLife("max");
  return (await readCatalogChunk(sha)).filter(({ post }) => post.published);
}
async function publicSearchChunk(sha: string) {
  "use cache";
  cacheLife("max");
  return readSearchChunk(sha);
}
async function publicBody(slug: string, sha: string) {
  "use cache";
  cacheLife("max");
  const post = parsePostFile(await readBlob(sha), slug);
  return post.published ? post : null;
}
const publicCatalog = cache(async () => {
  const manifest = await publicManifest();
  if (manifest)
    return sortCatalog(
      (
        await batches(manifest.catalog, ({ sha }) => publicCatalogChunk(sha))
      ).flat(),
    );
  return sortCatalog(
    (await readLocalPosts())
      .filter(({ post }) => post.published)
      .map(({ post, sha }) => summarize(post, sha)),
  );
});

async function snapshot(ref: string) {
  const manifest = (await readManifest(ref)) ?? {
    version: 1 as const,
    catalog: [],
    search: [],
  };
  const entries = sortCatalog(
    (
      await batches(manifest.catalog, ({ sha }) => readCatalogChunk(sha))
    ).flat(),
  );
  return { manifest, entries };
}
export async function getStoredPostsWithSha(ref?: string) {
  if (!usesGitHubStorage())
    return sortCatalog(
      (await readLocalPosts()).map(({ post, sha }) => summarize(post, sha)),
    );
  return (await snapshot(ref ?? (await headRef()))).entries;
}
export async function getStoredPosts(ref?: string) {
  return (await getStoredPostsWithSha(ref)).map(({ post }) => post);
}
export async function getAllPosts(
  options: { category?: string; series?: string } = {},
) {
  return (await publicCatalog())
    .map(({ post }) => ({
      ...post,
      category: {
        ...post.category,
        name:
          getCategoryNavigation(post.category.slug)?.label ??
          post.category.name,
      },
    }))
    .filter(
      (post) =>
        (!options.category || post.category.slug === options.category) &&
        (!options.series || post.series === options.series),
    );
}
export async function getPostSummary(postId: string) {
  return (await getAllPosts()).find((post) => post.id === postId) ?? null;
}
export const getPost = cache(async (postId: string) => {
  const entry = (await publicCatalog()).find(({ post }) => post.id === postId);
  if (!entry) return null;
  const post = usesGitHubStorage()
    ? await publicBody(entry.post.slug, entry.sha)
    : (await getStoredPost(entry.post.slug))?.post;
  return post?.published && post.id === postId
    ? (
        await withCommentCounts([
          {
            ...post,
            category: {
              ...post.category,
              name:
                getCategoryNavigation(post.category.slug)?.label ??
                post.category.name,
            },
          },
        ])
      )[0]
    : null;
});
function paginate<T extends { slug: string }>(
  posts: T[],
  options: { first?: number; after?: string },
) {
  const start = options.after
    ? Math.max(0, posts.findIndex((post) => post.slug === options.after) + 1)
    : 0;
  const count = Number.isFinite(options.first)
    ? Math.max(1, Math.min(Math.floor(options.first!), 50))
    : 12;
  const page = posts.slice(start, start + count);
  const hasNextPage = start + page.length < posts.length;
  return {
    posts: page,
    totalCount: posts.length,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? page.at(-1)!.slug : null,
    },
  };
}
export async function getPosts(
  options: {
    first?: number;
    after?: string;
    sort?: "latest" | "oldest";
    category?: string;
    series?: string;
  } = {},
) {
  const posts = await getAllPosts(options);
  if (options.sort === "oldest") posts.reverse();
  const result = paginate(posts, options);
  return { ...result, posts: await withCommentCounts(result.posts) };
}
export async function searchPosts(
  query: string,
  options: { first?: number; after?: string } = {},
) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return paginate([], options);
  const manifest = await publicManifest();
  const matches = new Set<string>();
  if (manifest) {
    // 검색 본문 전체를 메모리에 쌓지 않도록 일치하는 slug만 모은다.
    await batches(manifest.search, async ({ sha }) => {
      for (const value of await publicSearchChunk(sha))
        if (value.text.includes(normalized)) matches.add(value.slug);
    });
  } else {
    for (const { post } of await readLocalPosts())
      if (post.published && searchDocument(post).text.includes(normalized))
        matches.add(post.slug);
  }
  const result = paginate(
    (await getAllPosts()).filter((post) => matches.has(post.slug)),
    options,
  );
  return { ...result, posts: await withCommentCounts(result.posts) };
}

type Snapshot = Awaited<ReturnType<typeof snapshot>>;
async function indexChanges(
  state: Snapshot,
  changed: FilePost[],
  removed: string[] = [],
) {
  const edited = new Set([...removed, ...changed.map((post) => post.slug)]);
  const entries = [
    ...state.entries.filter(({ post }) => !edited.has(post.slug)),
    ...changed.map((post) => summarize(post, blobSha(serializePostFile(post)))),
  ];
  assertUniquePosts(entries);
  const catalog = buildChunks("catalog", entries);
  const buckets = new Set([...edited].map(indexBucket));
  const documents: SearchDocument[] = (
    await batches(
      state.manifest.search.filter(({ bucket }) => buckets.has(bucket)),
      ({ sha }) => readSearchChunk(sha),
    )
  )
    .flat()
    .filter(({ slug }) => !edited.has(slug));
  documents.push(
    ...changed.filter((post) => post.published).map(searchDocument),
  );
  const search = buildChunks("search", documents);
  const manifest: IndexManifest = {
    version: 1,
    catalog: catalog.refs,
    search: [
      ...state.manifest.search.filter(({ bucket }) => !buckets.has(bucket)),
      ...search.refs,
    ].sort(
      (a, b) => a.bucket.localeCompare(b.bucket) || a.sha.localeCompare(b.sha),
    ),
  };
  const oldFiles = new Set([
    ...state.manifest.catalog.map(({ sha }) => chunkPath("catalog", sha)),
    ...state.manifest.search.map(({ sha }) => chunkPath("search", sha)),
  ]);
  const currentFiles = new Set([
    ...manifest.catalog.map(({ sha }) => chunkPath("catalog", sha)),
    ...manifest.search.map(({ sha }) => chunkPath("search", sha)),
  ]);
  return {
    files: [...catalog.files, ...search.files]
      .filter(({ path }) => !oldFiles.has(path))
      .concat({ path: INDEX_PATH, content: JSON.stringify(manifest) }),
    removed: [...oldFiles].filter((file) => !currentFiles.has(file)),
  };
}
async function commitFiles(
  ref: string,
  files: IndexFile[],
  removed: string[],
  message: string,
) {
  const parent = await gitJson(`/git/commits/${ref}`);
  if (!gitShaSchema.safeParse(parent.tree?.sha).success)
    throw new PostStoreError("기존 콘텐츠 트리를 확인할 수 없습니다.", 502);
  const tree = await gitJson("/git/trees", {
    method: "POST",
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: [
        ...files.map(({ path, content }) => ({
          path,
          mode: "100644",
          type: "blob",
          content,
        })),
        ...removed.map((path) => ({
          path,
          mode: "100644",
          type: "blob",
          sha: null,
        })),
      ],
    }),
  });
  const commit = await gitJson("/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: gitShaSchema.parse(tree.sha),
      parents: [ref],
    }),
  });
  // 동시에 저장된 변경을 덮어쓰지 않도록 강제 갱신을 금지한다.
  await gitJson(`/git/refs/heads/${branchPath()}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: gitShaSchema.parse(commit.sha), force: false }),
  });
}
export async function savePost(
  slug: string,
  input: unknown,
  sha: string | null,
  pinned?: PinnedOrder,
) {
  if (!usesGitHubStorage())
    throw new PostStoreError(
      "글을 저장하려면 CONTENT_SOURCE=github 설정이 필요합니다.",
      503,
    );
  slugSchema.parse(slug);
  const fields = postFieldsSchema.parse(input);
  if (fields.published && !fields.body.trim())
    throw new PostStoreError("본문을 입력해 주세요.", 400);
  const navigation = getCategoryNavigation(fields.category.slug);
  if (
    fields.series &&
    !navigation?.series.some((series) => series.slug === fields.series)
  )
    throw new PostStoreError("카테고리에 등록된 시리즈를 선택해 주세요.", 400);
  const ordering = pinned ? pinnedOrderSchema.parse(pinned) : undefined;
  const ref = await headRef();
  const previous = await getStoredPost(slug, ref);
  let matchingVersion = (previous?.sha ?? null) === sha;
  if (!matchingVersion && previous && sha && ordering) {
    // 다른 글의 고정 순서를 바꾸면 이 파일의 SHA도 달라질 수 있다.
    // 고정 정보만 바뀐 경우에 한해 저장을 허용한다.
    try {
      const original = parsePostFile(await readBlob(sha), slug);
      matchingVersion =
        serializePostFile({
          ...original,
          featured: previous.post.featured,
          featuredOrder: previous.post.featuredOrder,
        }) === serializePostFile(previous.post);
    } catch {
      matchingVersion = false;
    }
  }
  if (!matchingVersion)
    throw new PostStoreError(
      "글이 변경되었거나 같은 주소가 이미 존재합니다. 내용을 보관하고 다시 열어 주세요.",
      409,
    );
  if (!fields.published && !(await gitJson("")).private)
    throw new PostStoreError(
      "공개 저장소에는 비공개로 저장할 수 없습니다. 임시 저장을 사용해 주세요.",
      400,
    );
  const now = new Date().toISOString();
  const post: FilePost = {
    ...(previous?.post ?? {
      id: randomUUID(),
      createdAt: now,
      commentsCount: 0,
      reactionsCount: 0,
    }),
    ...fields,
    series: fields.series,
    category: {
      slug: fields.category.slug,
      name: navigation?.label ?? fields.category.name,
    },
    excerpt: createExcerpt(fields.body),
    slug,
    lastEditedAt: previous ? now : null,
  };
  const state = await snapshot(ref);
  const changed: FilePost[] = [post];
  if (ordering) {
    const currentPosts = pinnedPosts(state.entries.map(({ post }) => post));
    const current = currentPosts.map(({ slug }) => slug);
    if (!samePinnedOrder(current, ordering.base))
      throw new PostStoreError(
        "Pinned 목록이 변경되었습니다. 적용할 목록을 선택해 주세요. 작성 내용은 유지됩니다.",
        409,
        { kind: "pinned", posts: currentPosts },
      );
    const allowed = new Set(current);
    allowed.delete(slug);
    const currentPinned = post.featured && post.published;
    if (currentPinned) allowed.add(slug);
    const ranks = new Map(ordering.order.map((slug, index) => [slug, index]));
    if (
      ranks.size !== ordering.order.length ||
      ordering.order.some((slug) => !allowed.has(slug)) ||
      ranks.has(slug) !== currentPinned
    )
      throw new PostStoreError("Pinned 목록이 올바르지 않습니다.", 400);
    post.featuredOrder = currentPinned ? ranks.get(slug) : undefined;
    for (const { post: summary, sha: storedSha } of state.entries) {
      if (summary.slug === slug) continue;
      const rank = ranks.get(summary.slug);
      if (
        !summary.featured ||
        (rank !== undefined && summary.featuredOrder === rank)
      )
        continue;
      const stored = await getStoredPost(summary.slug, ref);
      if (!stored || stored.sha !== storedSha)
        throw new PostStoreError(
          "Pinned 글이 변경되었습니다. 인덱스를 다시 생성해 주세요.",
          409,
        );
      changed.push({
        ...stored.post,
        featured: rank !== undefined,
        featuredOrder: rank,
      });
    }
  }
  const index = await indexChanges(state, changed);
  await commitFiles(
    ref,
    [
      ...changed.map((value) => ({
        path: `content/posts/${value.slug}.md`,
        content: serializePostFile(value),
      })),
      ...index.files,
    ],
    index.removed,
    `${previous ? "Update" : "Publish"} post and index: ${slug}`,
  );
  return {
    post,
    sha: blobSha(serializePostFile(post)),
    ...(ordering && { pinned: ordering.order }),
  };
}
export async function deletePost(slug: string, sha: string) {
  if (!usesGitHubStorage())
    throw new PostStoreError("GitHub 글쓰기 설정이 필요합니다.", 503);
  slugSchema.parse(slug);
  const ref = await headRef();
  const previous = await getStoredPost(slug, ref);
  if (!previous || previous.sha !== sha)
    throw new PostStoreError(
      "글이 변경되었습니다. 다시 열어 확인해 주세요.",
      409,
    );
  const index = await indexChanges(await snapshot(ref), [], [slug]);
  await commitFiles(
    ref,
    index.files,
    [...index.removed, `content/posts/${slug}.md`],
    `Delete post and index: ${slug}`,
  );
}
export async function rebuildPostIndex(source: {
  ref: string;
  posts: { post: FilePost; sha: string }[];
}) {
  if (!usesGitHubStorage())
    throw new PostStoreError("GitHub 콘텐츠 설정이 필요합니다.", 503);
  const ref = gitShaSchema.parse(source.ref);
  const manifest = await readManifest(ref);
  const entries = source.posts.map(({ post, sha }) => summarize(post, sha));
  assertUniquePosts(entries);
  const catalog = buildChunks("catalog", entries);
  const search = buildChunks(
    "search",
    source.posts
      .filter(({ post }) => post.published)
      .map(({ post }) => searchDocument(post)),
  );
  const next: IndexManifest = {
    version: 1,
    catalog: catalog.refs,
    search: search.refs,
  };
  const previous = new Set([
    ...(manifest?.catalog.map(({ sha }) => chunkPath("catalog", sha)) ?? []),
    ...(manifest?.search.map(({ sha }) => chunkPath("search", sha)) ?? []),
  ]);
  const files = [...catalog.files, ...search.files];
  const current = new Set(files.map(({ path }) => path));
  await commitFiles(
    ref,
    [
      ...files.filter(({ path }) => !previous.has(path)),
      { path: INDEX_PATH, content: JSON.stringify(next) },
    ],
    [...previous].filter((path) => !current.has(path)),
    "Rebuild post catalog and search index",
  );
  return {
    posts: source.posts.length,
    published: source.posts.filter(({ post }) => post.published).length,
  };
}
