import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PinnedPost } from "@/domain/pinned-posts";
import { resolvePostPublishedAt } from "@/lib/content";
import {
  parsePostFile,
  slugSchema,
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
  decodeChunk,
  assertUniquePosts,
  type CatalogEntry,
  type IndexFile,
} from "@/lib/content/post-index";

export class PostStoreError extends Error {
  constructor(
    message: string,
    public status: number,
    public conflict?:
      | { kind: "pinned"; posts: PinnedPost[] }
      | { kind: "post"; sha: string | null; id: string | null },
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
  const operation = endpoint.startsWith("/contents/")
    ? "contents"
    : endpoint.split("/").slice(1, 3).join("/") || "repository";
  let response: Response;
  try {
    response = await fetch(`${base}${endpoint}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:
          new Headers(init.headers).get("Accept") ??
          "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
      signal: init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("[github] Request failed", {
      operation,
      method: init.method ?? "GET",
      reason:
        error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
          ? error.name
          : "network",
    });
    throw new PostStoreError(
      "GitHub 연결을 완료하지 못했습니다. 다시 시도해 주세요.",
      502,
    );
  }
  if (!response.ok && response.status !== 404)
    console.error("[github] Request failed", {
      operation,
      method: init.method ?? "GET",
      status: response.status,
      requestId: response.headers
        .get("x-github-request-id")
        ?.replace(/[^a-zA-Z0-9:-]/g, "")
        .slice(0, 100),
      retryAfter: response.headers
        .get("retry-after")
        ?.replace(/[^0-9]/g, "")
        .slice(0, 10),
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
export async function gitJson(endpoint: string, init?: RequestInit) {
  const response = await request(endpoint, init);
  if (!response.ok)
    throw new PostStoreError("콘텐츠 브랜치를 찾을 수 없습니다.", 503);
  return response.json();
}
export async function headRef() {
  const sha = (await gitJson(`/git/ref/heads/${branchPath()}`)).object?.sha;
  if (!gitShaSchema.safeParse(sha).success)
    throw new PostStoreError("콘텐츠 브랜치를 확인할 수 없습니다.", 502);
  return sha as string;
}
async function readContent(filePath: string, ref: string) {
  const response = await request(
    `/contents/${filePath}?ref=${encodeURIComponent(ref)}`,
    { headers: { Accept: "application/vnd.github.object+json" } },
  );
  if (response.status === 404) return null;
  const file = await response.json();
  if (file.type !== "file" || !["base64", "none"].includes(file.encoding))
    throw new PostStoreError("지원하지 않는 콘텐츠 파일입니다.", 502);
  return {
    content:
      file.encoding === "none"
        ? await readBlob(gitShaSchema.parse(file.sha))
        : Buffer.from(file.content, "base64").toString("utf8"),
    sha: gitShaSchema.parse(file.sha),
  };
}
export async function readBlob(sha: string) {
  const file = await gitJson(`/git/blobs/${gitShaSchema.parse(sha)}`);
  if (file.encoding !== "base64")
    throw new PostStoreError("콘텐츠를 읽을 수 없습니다.", 502);
  const content = Buffer.from(file.content, "base64").toString("utf8");
  if (blobSha(content) !== sha)
    throw new PostStoreError("콘텐츠 무결성 확인에 실패했습니다.", 502);
  return content;
}
export async function batches<T, R>(
  values: T[],
  read: (value: T) => Promise<R>,
): Promise<R[]> {
  const result: R[] = [];
  for (let i = 0; i < values.length; i += 8)
    result.push(...(await Promise.all(values.slice(i, i + 8).map(read))));
  return result;
}
export function sortCatalog(entries: CatalogEntry[]) {
  assertUniquePosts(entries);
  return entries.sort(
    (a, b) =>
      Date.parse(resolvePostPublishedAt(b.post)) -
        Date.parse(resolvePostPublishedAt(a.post)) ||
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

export async function readLocalPosts() {
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
export async function readManifest(ref = config().branch) {
  const file = await readContent(INDEX_PATH, ref);
  return file ? manifestSchema.parse(JSON.parse(file.content)) : null;
}
export async function readCatalogChunk(sha: string) {
  return catalogSchema.parse(decodeChunk(await readBlob(sha)));
}
export async function readSearchChunk(sha: string) {
  return searchSchema.parse(decodeChunk(await readBlob(sha)));
}
export async function snapshot(ref: string) {
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
export async function commitFiles(
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
  await gitJson(`/git/refs/heads/${branchPath()}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: gitShaSchema.parse(commit.sha), force: false }),
  });
}
