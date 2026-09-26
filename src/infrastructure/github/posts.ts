import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { withCommentCounts } from "./comment-counts";
import { createExcerpt } from "@/lib/content/excerpt";
import {
  pinnedPosts,
  pinnedOrderSchema,
  type PinnedOrder,
} from "@/features/write/pinned-posts";
import {
  parsePostFile,
  serializePostFile,
  slugSchema,
  postFieldsSchema,
  type FilePost,
} from "@/lib/content/post-file";

export class PostStoreError extends Error {
  constructor(
    message: string,
    public status: number,
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
      "다른 변경이 먼저 저장되었습니다. 현재 내용을 복사해 보관한 뒤 글을 다시 열어 주세요.",
      409,
    );
  if (!response.ok && response.status !== 404)
    throw new PostStoreError(
      "GitHub 저장소 요청에 실패했습니다. 권한과 연결을 확인해 주세요.",
      502,
    );
  return response;
}
function endpoint(slug?: string) {
  return `/contents/content/posts${slug ? `/${slugSchema.parse(slug)}.md` : ""}`;
}
export async function getStoredPost(
  slug: string,
  ref?: string,
  signal?: AbortSignal,
): Promise<{ post: FilePost; sha: string } | null> {
  if (!slugSchema.safeParse(slug).success) return null;
  if (!usesGitHubStorage()) {
    try {
      return {
        post: parsePostFile(
          await readFile(localPostsPath(`${slug}.md`), "utf8"),
          slug,
        ),
        sha: "local",
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  const response = await request(
    `${endpoint(slug)}?ref=${encodeURIComponent(ref ?? config().branch)}`,
    { signal },
  );
  if (response.status === 404) return null;
  const file = await response.json();
  if (file.type !== "file" || file.encoding !== "base64")
    throw new PostStoreError("지원하지 않는 콘텐츠 파일입니다.", 502);
  return {
    post: parsePostFile(
      Buffer.from(file.content, "base64").toString("utf8"),
      slug,
    ),
    sha: String(file.sha),
  };
}

export async function getStoredPostsWithSha(
  ref?: string,
): Promise<{ post: FilePost; sha: string }[]> {
  const signal = AbortSignal.timeout(15_000);
  let names: string[];
  if (usesGitHubStorage()) {
    const response = await request(
      `${endpoint()}?ref=${encodeURIComponent(ref ?? config().branch)}`,
      { signal },
    );
    if (response.status === 404) {
      const refResponse = await request(`/git/ref/heads/${branchPath()}`, {
        signal,
      });
      if (refResponse.status === 404)
        throw new PostStoreError("콘텐츠 브랜치를 찾을 수 없습니다.", 503);
      return [];
    }
    const files = await response.json();
    if (!Array.isArray(files) || files.length >= 1000)
      throw new PostStoreError("콘텐츠 목록을 안전하게 읽을 수 없습니다.", 502);
    names = files.filter((f) => f.type === "file").map((f) => String(f.name));
  } else {
    try {
      names = await readdir(localPostsPath());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      names = [];
    }
  }
  const posts: { post: FilePost; sha: string }[] = [];
  // GitHub API에 요청이 몰리지 않도록 8개씩 읽는다.
  const slugs = names
    .filter((n) => n.endsWith(".md"))
    .map((n) => n.slice(0, -3));
  for (let i = 0; i < slugs.length; i += 8) {
    const batch = await Promise.all(
      slugs.slice(i, i + 8).map((slug) => getStoredPost(slug, ref, signal)),
    );
    for (const value of batch) {
      if (!value)
        throw new PostStoreError(
          "목록이 변경되었습니다. 다시 시도해 주세요.",
          409,
        );
      posts.push(value);
    }
  }
  return posts.sort(
    (a, b) =>
      Date.parse(b.post.createdAt) - Date.parse(a.post.createdAt) ||
      a.post.slug.localeCompare(b.post.slug, "en", { numeric: true }),
  );
}
export async function getStoredPosts(ref?: string): Promise<FilePost[]> {
  return (await getStoredPostsWithSha(ref)).map(({ post }) => post);
}
// 비공개 글은 공용 캐시에 넣지 않는다.
const publishedPosts = unstable_cache(
  async () =>
    withCommentCounts((await getStoredPosts()).filter((p) => p.published)),
  [
    "markdown-posts-v1",
    process.env.CONTENT_SOURCE ?? "local",
    process.env.LOCAL_CONTENT_PATH ?? "content/posts",
    process.env.GITHUB_OWNER ?? "",
    process.env.GITHUB_REPO ?? "",
    process.env.GITHUB_CONTENT_BRANCH ?? "",
    process.env.NEXT_PUBLIC_GISCUS_REPO ?? "",
    process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? "",
  ],
  { revalidate: 60, tags: ["posts"] },
);
export async function getAllPosts(options: { category?: string } = {}) {
  return (await publishedPosts()).filter(
    (p) => !options.category || p.category.slug === options.category,
  );
}
export async function getPost(postId: string) {
  return (await getAllPosts()).find((post) => post.id === postId) ?? null;
}
export async function getPosts(
  options: {
    first?: number;
    after?: string;
    sort?: "latest" | "oldest";
  } = {},
) {
  const posts = await getAllPosts();
  if (options.sort === "oldest") posts.reverse();
  const start = options.after
    ? Math.max(0, posts.findIndex((p) => p.slug === options.after) + 1)
    : 0;
  const page = posts.slice(
    start,
    start + Math.max(1, Math.min(options.first ?? 12, 50)),
  );
  const hasNextPage = start + page.length < posts.length;
  return {
    posts: page,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? page.at(-1)!.slug : null,
    },
  };
}

export async function savePost(
  slug: string,
  input: unknown,
  sha: string | null,
  pinned?: PinnedOrder,
) {
  if (!usesGitHubStorage())
    throw new PostStoreError(
      "쓰기 기능을 사용하려면 CONTENT_SOURCE=github 설정이 필요합니다.",
      503,
    );
  slugSchema.parse(slug);
  const fields = postFieldsSchema.parse(input);
  if (fields.published && !fields.body.trim())
    throw new PostStoreError("본문을 입력해 주세요.", 400);
  const ordering = pinned ? pinnedOrderSchema.parse(pinned) : undefined;
  const branch = branchPath();
  const head = ordering ? await gitJson(`/git/ref/heads/${branch}`) : undefined;
  const ref = head?.object?.sha;
  if (ordering && !/^[a-f0-9]{40}$/.test(ref ?? ""))
    throw new PostStoreError("콘텐츠 브랜치를 확인할 수 없습니다.", 502);
  const previous = await getStoredPost(slug, ref);
  if ((previous?.sha ?? null) !== sha)
    throw new PostStoreError(
      "글이 변경되었거나 같은 주소가 이미 존재합니다. 내용을 복사해 보관하고 다시 열어 주세요.",
      409,
    );
  if (!fields.published) {
    const repo = await (await request("")).json();
    if (!repo.private)
      throw new PostStoreError(
        "공개 저장소에는 비공개 상태로 저장할 수 없습니다. 임시 저장은 이 브라우저에 보관해 주세요.",
        400,
      );
  }
  const now = new Date().toISOString();
  const post: FilePost = {
    ...(previous?.post ?? {
      id: randomUUID(),
      createdAt: now,
      commentsCount: 0,
      reactionsCount: 0,
    }),
    ...fields,
    excerpt: createExcerpt(fields.body),
    slug,
    lastEditedAt: previous ? now : null,
  };
  if (ordering) {
    // 조회 중 브랜치가 바뀌어도 검증 기준은 같은 커밋으로 유지한다.
    const posts = await getStoredPosts(ref);
    const current = pinnedPosts(posts).map((post) => post.slug);
    if (JSON.stringify(current) !== JSON.stringify(ordering.base))
      throw new PostStoreError(
        "Pinned 목록이 변경되었습니다. 작성 내용을 복사해 보관한 뒤 다시 열어 주세요.",
        409,
      );
    const allowed = new Set(current);
    allowed.delete(slug);
    const currentPinned = post.featured && post.published;
    if (currentPinned) allowed.add(slug);
    const orderIndex = new Map(
      ordering.order.map((value, index) => [value, index]),
    );
    if (
      orderIndex.size !== ordering.order.length ||
      ordering.order.some((value) => !allowed.has(value)) ||
      orderIndex.has(slug) !== currentPinned
    )
      throw new PostStoreError("Pinned 목록이 올바르지 않습니다.", 400);
    post.featuredOrder = currentPinned ? orderIndex.get(slug) : undefined;
    const changed: FilePost[] = [post];
    for (const value of posts) {
      if (value.slug === slug) continue;
      const index = orderIndex.get(value.slug);
      if (value.featured && index === undefined)
        changed.push({ ...value, featured: false, featuredOrder: undefined });
      else if (index !== undefined && value.featuredOrder !== index)
        changed.push({ ...value, featuredOrder: index });
    }
    const parent = await gitJson(`/git/commits/${ref}`);
    if (!/^[a-f0-9]{40}$/.test(parent.tree?.sha ?? ""))
      throw new PostStoreError("기존 콘텐츠 트리를 확인할 수 없습니다.", 502);
    const tree = await gitJson("/git/trees", {
      method: "POST",
      body: JSON.stringify({
        base_tree: parent.tree.sha,
        tree: changed.map((value) => ({
          path: `content/posts/${value.slug}.md`,
          mode: "100644",
          type: "blob",
          content: serializePostFile(value),
        })),
      }),
    });
    if (!/^[a-f0-9]{40}$/.test(tree.sha ?? ""))
      throw new PostStoreError("저장할 글을 확인할 수 없습니다.", 502);
    const content = Buffer.from(serializePostFile(post));
    const savedSha = createHash("sha1")
      .update(`blob ${content.length}\0`)
      .update(content)
      .digest("hex");
    const commit = await gitJson("/git/commits", {
      method: "POST",
      body: JSON.stringify({
        message: `${previous ? "Update" : "Publish"} post and pinned order: ${slug}`,
        tree: tree.sha,
        parents: [ref],
      }),
    });
    if (!/^[a-f0-9]{40}$/.test(commit.sha ?? ""))
      throw new PostStoreError("저장할 커밋을 확인할 수 없습니다.", 502);
    await gitJson(`/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
    return { post, sha: savedSha, pinned: ordering.order };
  }
  const response = await request(endpoint(slug), {
    method: "PUT",
    body: JSON.stringify({
      branch: config().branch,
      sha: sha ?? undefined,
      message: `${previous ? "Update" : "Publish"} post: ${slug}`,
      content: Buffer.from(serializePostFile(post)).toString("base64"),
    }),
  });
  if (response.status === 404)
    throw new PostStoreError("콘텐츠 브랜치를 찾을 수 없습니다.", 502);
  const result = await response.json();
  return { post, sha: String(result.content.sha) };
}
export async function deletePost(slug: string, sha: string) {
  if (!usesGitHubStorage())
    throw new PostStoreError("GitHub 쓰기 설정이 필요합니다.", 503);
  const previous = await getStoredPost(slug);
  if (!previous || previous.sha !== sha)
    throw new PostStoreError(
      "글이 변경되었습니다. 다시 열어 확인해 주세요.",
      409,
    );
  const response = await request(endpoint(slug), {
    method: "DELETE",
    body: JSON.stringify({
      sha,
      branch: config().branch,
      message: `Delete post: ${slug}`,
    }),
  });
  if (response.status === 404)
    throw new PostStoreError("글을 찾을 수 없습니다.", 404);
}

async function gitJson(endpoint: string, init?: RequestInit) {
  const response = await request(endpoint, init);
  if (!response.ok)
    throw new PostStoreError("콘텐츠 브랜치를 확인할 수 없습니다.", 502);
  return response.json();
}
