import { savePost, deletePost, rebuildPostIndex } from "./post-mutations";
import {
  getStoredPost,
  getStoredPostsWithSha,
  getStoredPosts,
} from "./post-store";
import { POST_BODY_MAX_BYTES } from "@/domain/post";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import {
  parsePostFile,
  serializePostFile,
  type StoredPost,
  type FilePost,
} from "@/lib/content/post-file";
import {
  INDEX_PATH,
  blobSha,
  buildChunks,
  chunkPath,
  decodeChunk,
  indexBucket,
  summarize,
  searchDocument,
  type IndexManifest,
} from "@/lib/content/post-index";
import {
  getAllPosts,
  getPostContent,
  getRecentPostContents,
  getPostSummary,
  getPosts,
  searchPosts,
} from "./posts";
import { invalidatePosts } from "@/lib/writer-api";
import { cacheTag, revalidateTag } from "next/cache";
import { withCommentCounts } from "./comment-counts";
import * as site from "@/config/site";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("./comment-counts", () => ({
  withCommentCounts: vi.fn((posts: unknown) => posts),
}));
const sample: StoredPost = {
  id: "a",
  slug: "a",
  title: "title",
  body: "body",
  category: { name: "Art", slug: "art" },
  tags: [],
  coverImage: { src: "" },
  featured: false,
  published: true,
  createdAt: "2026-01-01T00:00:00Z",
  lastEditedAt: null,
  commentsCount: 0,
  reactionsCount: 0,
};
beforeEach(() => {
  vi.stubEnv("CONTENT_SOURCE", "local");
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function githubStore(posts: StoredPost[], indexed = true) {
  for (const [key, value] of Object.entries({
    CONTENT_SOURCE: "github",
    GITHUB_OWNER: "owner",
    GITHUB_REPO: "repo",
    GITHUB_TOKEN: "test",
    GITHUB_CONTENT_BRANCH: "content",
  }))
    vi.stubEnv(key, value);
  const files = new Map(
    posts.map((post) => [
      `content/posts/${post.slug}.md`,
      serializePostFile(post),
    ]),
  );
  if (indexed) {
    const values = posts.map((post) =>
      parsePostFile(serializePostFile(post), post.slug),
    );
    const catalog = buildChunks(
      "catalog",
      values.map((post) => summarize(post, blobSha(serializePostFile(post)))),
    );
    const search = buildChunks(
      "search",
      values.filter((post) => post.published).map(searchDocument),
    );
    const manifest: IndexManifest = {
      version: 1,
      catalog: catalog.refs,
      search: search.refs,
    };
    for (const file of [...catalog.files, ...search.files])
      files.set(file.path, file.content);
    files.set(INDEX_PATH, JSON.stringify(manifest));
  }
  const blobs = new Map(
    [...files.values()].map((content) => [blobSha(content), content]),
  );
  let head = "a".repeat(40);
  const root = "b".repeat(40);
  const staged = new Map<string, Map<string, string>>();
  let pending = files;
  const state = {
    conflict: false,
    invalidTree: false,
    treeInput: null as null | {
      base_tree: string;
      tree: { path: string; content?: string; sha?: null }[];
    },
  };
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const parsed = new URL(url);
    const route = parsed.pathname.replace("/repos/owner/repo", "");
    if (route === "/git/ref/heads/content")
      return Response.json({ object: { sha: head } });
    if (route.startsWith("/contents/")) {
      const content = files.get(route.slice("/contents/".length));
      return content === undefined
        ? new Response(null, { status: 404 })
        : Response.json({
            type: "file",
            encoding:
              Buffer.byteLength(content) > 1_000_000 ? "none" : "base64",
            content:
              Buffer.byteLength(content) > 1_000_000
                ? ""
                : Buffer.from(content).toString("base64"),
            sha: blobSha(content),
          });
    }
    if (route.startsWith("/git/blobs/")) {
      const content = blobs.get(route.split("/").at(-1)!);
      if (content === undefined) throw new Error(`Missing blob: ${route}`);
      return Response.json({
        encoding: "base64",
        content: Buffer.from(content).toString("base64"),
      });
    }
    if (route === `/git/commits/${head}`)
      return Response.json({ tree: state.invalidTree ? {} : { sha: root } });
    if (route === "/git/trees" && init.method === "POST") {
      state.treeInput = JSON.parse(init.body as string);
      expect(state.treeInput!.base_tree).toBe(root);
      pending = new Map(files);
      for (const file of state.treeInput!.tree) {
        if (file.sha === null) {
          expect(pending.has(file.path)).toBe(true);
          pending.delete(file.path);
        } else {
          pending.set(file.path, file.content!);
          blobs.set(blobSha(file.content!), file.content!);
        }
      }
      return Response.json({ sha: root });
    }
    if (route === "/git/commits" && init.method === "POST") {
      const body = JSON.parse(init.body as string);
      expect(body.parents).toEqual([head]);
      const sha = blobSha(JSON.stringify(body) + staged.size);
      staged.set(sha, pending);
      return Response.json({ sha });
    }
    if (route === "/git/refs/heads/content" && init.method === "PATCH") {
      const body = JSON.parse(init.body as string);
      expect(body.force).toBe(false);
      if (state.conflict) return new Response(null, { status: 422 });
      head = body.sha;
      files.clear();
      for (const [path, content] of staged.get(head)!) files.set(path, content);
      return Response.json({ object: { sha: head } });
    }
    throw new Error(`Unexpected request: ${route}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { files, blobs, fetchMock, state, head };
}

describe("Markdown store", () => {
  it("saves, searches across index boundaries, rereads and edits a maximum-size post", async () => {
    const { files } = githubStore([]);
    const body = "x".repeat(POST_BODY_MAX_BYTES - 30) + "끝 검색어 😀";
    const start = performance.now();
    const saved = await savePost(
      "large",
      { ...sample, id: undefined, body },
      null,
    );
    expect((await getStoredPost("large"))?.post.body).toBe(body);
    expect((await getPostContent(saved.post.id))?.body).toBe(body);
    const document = searchDocument(saved.post);
    const boundary = document.text.slice(99_995, 100_005);
    expect((await searchPosts(boundary)).totalCount).toBe(1);
    expect((await searchPosts("끝 검색어 😀")).totalCount).toBe(1);
    const edited = await savePost(
      "large",
      { ...saved.post, body: body.slice(0, -30) + "재편집 검색어" },
      saved.sha,
    );
    expect((await getStoredPost("large"))?.post.body).toBe(edited.post.body);
    expect((await searchPosts("재편집 검색어")).totalCount).toBe(1);
    expect((await searchPosts("끝 검색어 😀")).totalCount).toBe(0);
    expect(files.get("content/posts/large.md")).toContain("재편집 검색어");
    console.info("[size-check]", {
      bodyBytes: Buffer.byteLength(body),
      elapsedMs: Math.round(performance.now() - start),
    });
  }, 60_000);
  it("reads public content for RSS without querying comments", async () => {
    githubStore([
      sample,
      { ...sample, slug: "draft", id: "draft", published: false },
    ]);
    expect((await getPostContent(sample.id))?.body).toBe(sample.body);
    expect(await getPostContent("draft")).toBeNull();
    expect((await getRecentPostContents(10)).map((post) => post?.id)).toEqual([
      sample.id,
    ]);
    expect(withCommentCounts).not.toHaveBeenCalled();
    await getPostSummary(sample.id);
    expect(withCommentCounts).not.toHaveBeenCalled();
    await getPosts();
    expect(withCommentCounts).toHaveBeenCalledOnce();
  });
  it("preserves first publication and only advances modification dates for content changes", async () => {
    githubStore([]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));
    const published = await savePost(
      "first",
      { ...sample, id: undefined },
      null,
    );
    expect(published.post.createdAt).toBe("2026-02-01T00:00:00.000Z");
    expect(published.post.publishedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(published.post.lastEditedAt).toBeNull();
    vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));
    const unchanged = await savePost("first", published.post, published.sha);
    expect(unchanged.post.lastEditedAt).toBeNull();
    const edited = await savePost(
      "first",
      { ...unchanged.post, body: "new body" },
      unchanged.sha,
    );
    expect(edited.post.lastEditedAt).toBe("2026-03-01T00:00:00.000Z");
    vi.setSystemTime(new Date("2026-04-01T00:00:00Z"));
    const featured = await savePost(
      "first",
      { ...edited.post, featured: true },
      edited.sha,
    );
    expect(featured.post.publishedAt).toBe(published.post.publishedAt);
    expect(featured.post.lastEditedAt).toBe(edited.post.lastEditedAt);
  });
  it("does not repeat the first page for missing, filtered or exhausted cursors", async () => {
    githubStore([
      sample,
      {
        ...sample,
        id: "b",
        slug: "b",
        category: { name: "Study", slug: "study" },
      },
      { ...sample, id: "private", slug: "private", published: false },
    ]);
    for (const after of ["missing", "private", "b"]) {
      expect(await getPosts({ category: "art", after })).toMatchObject({
        posts: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      });
    }
    expect((await getPosts({ after: "b" })).posts).toEqual([]);
    expect((await searchPosts("title", { after: "missing" })).posts).toEqual(
      [],
    );
  });
  it("publishes with the draft ID, keeps existing IDs immutable and rejects duplicate or invalid new IDs", async () => {
    const id = "b4300eb9-7058-4f2b-82e0-857745ccc2a9";
    const { fetchMock } = githubStore([]);
    const created = await savePost("first", { ...sample, id }, null);
    expect(created.post.id).toBe(id);
    const edited = await savePost(
      "first",
      { ...sample, id: "changed-id" },
      created.sha,
    );
    expect(edited.post.id).toBe(id);
    const writes = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "PATCH",
    ).length;
    await expect(savePost("second", { ...sample, id }, null)).rejects.toThrow(
      "Duplicate post ID",
    );
    await expect(
      savePost("second", { ...sample, id: "../invalid" }, null),
    ).rejects.toThrow();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(writes);
  });
  it("looks up published posts by ID rather than storage slug and omits bodies from lists", async () => {
    expect((await getPostContent("fixture-id-8"))?.slug).toBe("post-8");
    expect(await getPostContent("post-8")).toBeNull();
    expect(await getPostSummary("fixture-id-8")).not.toHaveProperty("body");
    const posts = await getAllPosts();
    expect(posts).toHaveLength(8);
    expect(posts.every((post) => !("body" in post))).toBe(true);
    const first = await getPosts({ first: 2, sort: "oldest" });
    const second = await getPosts({
      first: 2,
      after: first.pageInfo.endCursor!,
      sort: "oldest",
    });
    expect(
      new Set([...first.posts, ...second.posts].map((post) => post.slug)).size,
    ).toBe(4);
  });
  it("round-trips committed Markdown bodies and optional series metadata", async () => {
    for (const name of await readdir("tests/fixtures/posts")) {
      if (!name.endsWith(".md")) continue;
      const post = parsePostFile(
        await readFile(`tests/fixtures/posts/${name}`, "utf8"),
        name.slice(0, -3),
      );
      expect(parsePostFile(serializePostFile(post), post.slug).body).toBe(
        post.body,
      );
    }
    expect(
      parsePostFile(serializePostFile({ ...sample, series: "react" }), "a"),
    ).toMatchObject({ series: "react" });
  });
  it("treats a missing local directory as empty", async () => {
    vi.stubEnv("LOCAL_CONTENT_PATH", "tests/fixtures/no-posts-directory");
    expect(await getStoredPostsWithSha()).toEqual([]);
  });
  it("requires a real remote branch and never falls back to local data", async () => {
    const { fetchMock } = githubStore([], false);
    fetchMock.mockImplementation(
      async () => new Response(null, { status: 404 }),
    );
    await expect(getStoredPosts()).rejects.toMatchObject({ status: 503 });
    await expect(getAllPosts()).rejects.toMatchObject({ status: 503 });
  });
  it("supports an existing empty branch", async () => {
    githubStore([], false);
    expect(await getStoredPostsWithSha()).toEqual([]);
    expect(await getAllPosts()).toEqual([]);
  });
  it("creates the first post and index atomically on an empty branch", async () => {
    const { files, state } = githubStore([], false);
    const result = await savePost("first", { ...sample, id: undefined }, null);
    expect(result.post.slug).toBe("first");
    expect(result.post.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(files.has("content/posts/first.md")).toBe(true);
    expect(files.has(INDEX_PATH)).toBe(true);
    expect(state.treeInput!.tree.some(({ path }) => path === INDEX_PATH)).toBe(
      true,
    );
    expect((await getAllPosts()).map(({ slug }) => slug)).toEqual(["first"]);
    expect((await searchPosts("body")).totalCount).toBe(1);
  });
  it("does not scan unindexed Markdown during GitHub reads or searches", async () => {
    const { fetchMock } = githubStore([sample], false);
    expect(await getAllPosts()).toEqual([]);
    expect(await getStoredPostsWithSha()).toEqual([]);
    expect((await searchPosts("body")).totalCount).toBe(0);
    expect(await getPostContent(sample.id)).toBeNull();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        /\/git\/(trees|blobs)\/|\/contents\/content\/posts/.test(url),
      ),
    ).toBe(false);
  });
});

describe("indexed reads and immediate writes", () => {
  it("queries and paginates a full category by series without exposing private posts or bodies", async () => {
    const category = { name: "Essay", slug: "essay" };
    const selected = Array.from({ length: 13 }, (_, index) => ({
      ...sample,
      category,
      id: `series-${index}`,
      slug: `series-${index}`,
      series: "life-updates",
    }));
    const other = Array.from({ length: 13 }, (_, index) => ({
      ...sample,
      category,
      id: `other-${index}`,
      slug: `other-${index}`,
      createdAt: "2026-02-01T00:00:00Z",
    }));
    githubStore([
      ...selected,
      ...other,
      { ...selected[0], id: "private", slug: "private", published: false },
    ]);
    const all = await getPosts({ category: "essay" });
    expect(all.totalCount).toBe(26);
    expect(all.posts.every((post) => !post.series)).toBe(true);
    const first = await getPosts({
      category: "essay",
      series: "life-updates",
    });
    expect(first.totalCount).toBe(13);
    expect(first.posts).toHaveLength(12);
    expect(
      first.posts.every(
        (post) => post.series === "life-updates" && !("body" in post),
      ),
    ).toBe(true);
    const second = await getPosts({
      category: "essay",
      series: "life-updates",
      after: first.pageInfo.endCursor!,
    });
    expect(second.posts).toHaveLength(1);
    expect(
      new Set([...first.posts, ...second.posts].map((post) => post.id)).size,
    ).toBe(13);
  });
  it("lists series posts newest first and supports oldest-first pagination", async () => {
    const older = { ...sample, series: "life-updates" };
    const newer = {
      ...older,
      id: "newer",
      slug: "newer",
      createdAt: "2026-02-01T00:00:00Z",
    };
    githubStore([
      older,
      newer,
      { ...newer, id: "other", slug: "other", series: "other-series" },
    ]);
    expect(
      (await getPosts({ series: "life-updates" })).posts.map(
        ({ slug }) => slug,
      ),
    ).toEqual(["newer", "a"]);
    const first = await getPosts({
      series: "life-updates",
      sort: "oldest",
      first: 1,
    });
    expect(first.posts.map(({ slug }) => slug)).toEqual(["a"]);
    const second = await getPosts({
      series: "life-updates",
      sort: "oldest",
      first: 1,
      after: first.pageInfo.endCursor!,
    });
    expect(second.posts.map(({ slug }) => slug)).toEqual(["newer"]);
  });
  it("clears series metadata when omitted after changing category or selecting no series", async () => {
    const original: StoredPost = {
      ...sample,
      category: { slug: "development", name: "Development" },
      series: "react",
    };
    const { files } = githubStore([original]);
    const saved = await savePost(
      "a",
      sample,
      blobSha(serializePostFile(original)),
    );
    expect(saved.post.series).toBeUndefined();
    expect(
      parsePostFile(files.get("content/posts/a.md")!, "a").series,
    ).toBeUndefined();
    expect(
      (await getPosts({ category: "development", series: "react" })).posts,
    ).toEqual([]);
  });
  it("lists 5,000 articles, paginates categories, and reads only the selected detail body", async () => {
    const posts = Array.from({ length: 5000 }, (_, index) => ({
      ...sample,
      id: `id-${index}`,
      slug: `post-${index + 1}`,
      body: `Body ${index}`,
    }));
    const { fetchMock, files } = githubStore(posts);
    const page = await getPosts({ category: "art" });
    expect(page.totalCount).toBe(5000);
    expect(page.posts).toHaveLength(12);
    expect(page.posts.every((post) => !("body" in post))).toBe(true);
    const second = await getPosts({
      category: "art",
      after: page.pageInfo.endCursor!,
    });
    expect(
      new Set([...page.posts, ...second.posts].map(({ slug }) => slug)).size,
    ).toBe(24);
    expect(
      fetchMock.mock.calls.some(([url]) =>
        url.includes("/contents/content/posts"),
      ),
    ).toBe(false);
    const bodyShas = new Set(
      [...files]
        .filter(([path]) => path.startsWith("content/posts/"))
        .map(([, content]) => blobSha(content)),
    );
    expect(
      fetchMock.mock.calls.some(([url]) =>
        bodyShas.has(url.split("/").at(-1)!),
      ),
    ).toBe(false);
    const count = fetchMock.mock.calls.length;
    expect((await getPostContent("id-4300"))?.body).toBe("Body 4300");
    expect(
      fetchMock.mock.calls
        .slice(count)
        .filter(([url]) => bodyShas.has(url.split("/").at(-1)!)),
    ).toHaveLength(1);
    expect((await getStoredPostsWithSha())[0].post).not.toHaveProperty("body");
  }, 15_000);
  it("searches post fields on the server, paginates, and excludes private posts", async () => {
    const posts = Array.from({ length: 25 }, (_, index) => ({
      ...sample,
      id: `id-${index}`,
      slug: `post-${index + 1}`,
      body: "ordinary ".repeat(100) + "본문끝 검색어",
      tags: ["UniqueTag"],
    }));
    posts.push({
      ...sample,
      id: "private",
      slug: "private",
      published: false,
      body: "본문끝 검색어 private-secret",
    });
    const { fetchMock } = githubStore(posts);
    for (const query of [sample.title, sample.category.name, " UNIQUETAG "])
      expect((await searchPosts(query)).totalCount).toBe(25);
    expect((await searchPosts("없는 검색어")).totalCount).toBe(0);
    expect((await searchPosts("  ")).totalCount).toBe(0);
    const first = await searchPosts("본문끝 검색어");
    expect(first.totalCount).toBe(25);
    expect(first.posts).toHaveLength(12);
    const second = await searchPosts("본문끝 검색어", {
      after: first.pageInfo.endCursor!,
    });
    expect(
      new Set([...first.posts, ...second.posts].map(({ slug }) => slug)).size,
    ).toBe(24);
    expect((await searchPosts("private-secret")).totalCount).toBe(0);
    expect(await getPostContent("private")).toBeNull();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        url.includes("/contents/content/posts"),
      ),
    ).toBe(false);
    expect(first.posts.every((post) => !("body" in post))).toBe(true);
  });
  it("updates title, body, category, series and search with immediate tag invalidation", async () => {
    const getCategory = site.getCategoryNavigation;
    vi.spyOn(site, "getCategoryNavigation").mockImplementation((slug) => {
      const category = getCategory(slug);
      return category?.category === "development"
        ? {
            ...category,
            series: [{ slug: "fixture-series", label: "테스트 시리즈" }],
          }
        : category;
    });
    const { files } = githubStore([sample]);
    await getPosts();
    await getPostContent("a");
    await searchPosts("body");
    const result = await savePost(
      "a",
      {
        ...sample,
        title: "새 제목",
        body: "완전히 새 본문",
        category: { slug: "development", name: "forged" },
        series: "fixture-series",
      },
      blobSha(serializePostFile(sample)),
    );
    invalidatePosts();
    expect(cacheTag).toHaveBeenCalledWith("posts");
    expect(revalidateTag).toHaveBeenCalledWith("posts", { expire: 0 });
    expect(result.post.category.name).toBe("Development");
    expect((await getPostContent("a"))?.body).toBe("완전히 새 본문");
    expect((await getPosts({ category: "art" })).posts).toEqual([]);
    expect(
      (await getPosts({ category: "development", series: "fixture-series" }))
        .posts[0].title,
    ).toBe("새 제목");
    expect((await searchPosts("body")).totalCount).toBe(0);
    expect((await searchPosts("완전히 새 본문")).totalCount).toBe(1);
    expect(parsePostFile(files.get("content/posts/a.md")!, "a").series).toBe(
      "fixture-series",
    );
  });
  it("removes deleted articles from the catalog, detail, search, and cached reads", async () => {
    const { files } = githubStore([sample]);
    await getPostContent("a");
    await searchPosts("body");
    await deletePost("a", blobSha(serializePostFile(sample)));
    invalidatePosts();
    expect(await getAllPosts()).toEqual([]);
    expect(await getPostContent("a")).toBeNull();
    expect((await searchPosts("body")).totalCount).toBe(0);
    expect(files.has("content/posts/a.md")).toBe(false);
    expect(await getStoredPostsWithSha()).toEqual([]);
  });
  it("does not read unrelated bodies or rewrite unrelated search groups during an indexed edit", async () => {
    const other = { ...sample, slug: "b", id: "other" };
    expect(indexBucket(other.slug)).not.toBe(indexBucket(sample.slug));
    const { state, files, fetchMock } = githubStore([sample, other]);
    const before: IndexManifest = JSON.parse(files.get(INDEX_PATH)!);
    await savePost(
      "a",
      { ...sample, body: "edited" },
      blobSha(serializePostFile(sample)),
    );
    const after: IndexManifest = JSON.parse(files.get(INDEX_PATH)!);
    expect(
      after.search.filter(({ bucket }) => bucket === indexBucket(other.slug)),
    ).toEqual(
      before.search.filter(({ bucket }) => bucket === indexBucket(other.slug)),
    );
    expect(
      state.treeInput!.tree.filter(({ path }) =>
        path.startsWith("content/posts/"),
      ),
    ).toHaveLength(1);
    const otherSha = blobSha(serializePostFile(other));
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          url.endsWith(`/git/blobs/${otherSha}`) ||
          url.includes(`/content/posts/${other.slug}.md`),
      ),
    ).toBe(false);
  });
  it("rejects stale SHA, invalid series, remote private writes, and concurrent branch updates", async () => {
    const { files, fetchMock, state } = githubStore([sample]);
    const sha = blobSha(serializePostFile(sample));
    await expect(savePost("a", sample, "f".repeat(40))).rejects.toMatchObject({
      status: 409,
    });
    await expect(deletePost("a", "f".repeat(40))).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      savePost("a", { ...sample, series: "react" }, sha),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      savePost("a", { ...sample, published: false }, sha),
    ).rejects.toThrow();
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method)).toBe(true);
    state.conflict = true;
    await expect(
      savePost("a", { ...sample, title: "conflict" }, sha),
    ).rejects.toMatchObject({ status: 409 });
    expect(parsePostFile(files.get("content/posts/a.md")!, "a").title).toBe(
      sample.title,
    );
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(1);
  });
  it("rebuilds over 1,000 files from a checkout while preserving original blob hashes", async () => {
    const posts = Array.from({ length: 1001 }, (_, index) => ({
      ...sample,
      id: `id-${index}`,
      slug: `post-${index + 1}`,
    }));
    const store = githubStore(posts, false);
    const original = store.files.get("content/posts/post-1.md")!;
    const reformatted = original.replace('  "id":', '    "id":');
    store.files.set("content/posts/post-1.md", reformatted);
    store.blobs.set(blobSha(reformatted), reformatted);
    const result = await rebuildPostIndex({
      ref: store.head,
      posts: [...store.files].map(([filePath, content]) => ({
        post: parsePostFile(content, filePath.split("/").at(-1)!.slice(0, -3)),
        sha: blobSha(content),
      })),
    });
    expect(result.posts).toBe(1001);
    const entry = (await getStoredPostsWithSha()).find(
      ({ post }) => post.slug === "post-1",
    )!;
    expect(entry.sha).toBe(blobSha(reformatted));
    expect(store.files.get("content/posts/post-1.md")).toBe(reformatted);
    expect(
      store.fetchMock.mock.calls.some(([url]) =>
        url.includes("/contents/content/posts?"),
      ),
    ).toBe(false);
  });
  it("builds an index from a Git checkout snapshot without requesting individual Markdown blobs", async () => {
    const { head, files, fetchMock } = githubStore([sample], false);
    const content = files.get("content/posts/a.md")!;
    expect(
      await rebuildPostIndex({
        ref: head,
        posts: [{ post: parsePostFile(content, "a"), sha: blobSha(content) }],
      }),
    ).toEqual({ posts: 1, published: 1 });
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          url.includes("/git/blobs/") ||
          url.includes("/contents/content/posts"),
      ),
    ).toBe(false);
    expect(files.get("content/posts/a.md")).toBe(content);
    expect((await getPostContent("a"))?.body).toBe(sample.body);
  });
});

describe("atomic pinned ordering", () => {
  const first = { ...sample, featured: true, featuredOrder: 0 };
  const second = {
    ...sample,
    slug: "b",
    id: "b",
    featured: true,
    featuredOrder: 1,
    body: "# 원문\n\n그대로 보존\n",
  };
  it("returns current pins after rank-only SHA changes, then saves after explicit resolution without accepting content conflicts", async () => {
    const { files, fetchMock } = githubStore([first, second]);
    const originalSha = blobSha(serializePostFile(second));
    await savePost("a", first, blobSha(serializePostFile(first)), {
      base: ["a", "b"],
      order: ["b", "a"],
    });
    const writes = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "PATCH",
    ).length;
    await expect(
      savePost("b", { ...second, body: "Local edited body" }, originalSha, {
        base: ["a", "b"],
        order: ["b", "a"],
      }),
    ).rejects.toMatchObject({
      status: 409,
      conflict: { kind: "pinned", posts: [{ slug: "b" }, { slug: "a" }] },
    });
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(writes);
    await savePost("b", { ...second, body: "Local edited body" }, originalSha, {
      base: ["b", "a"],
      order: ["b", "a"],
    });
    expect(parsePostFile(files.get("content/posts/b.md")!, "b").body).toBe(
      "Local edited body",
    );
    await expect(
      savePost("b", { ...second, body: "Stale overwrite" }, originalSha, {
        base: ["b", "a"],
        order: ["b", "a"],
      }),
    ).rejects.toMatchObject({
      status: 409,
      conflict: { kind: "post", id: "b" },
    });
    expect(parsePostFile(files.get("content/posts/b.md")!, "b").body).toBe(
      "Local edited body",
    );
  });
  it("commits edited content, changed ranks, catalog and search together while preserving other bodies", async () => {
    const { files, state, fetchMock } = githubStore([first, second]);
    const result = await savePost(
      "a",
      { ...first, title: "수정", body: "새 **본문**" },
      blobSha(serializePostFile(first)),
      { base: ["a", "b"], order: ["b", "a"] },
    );
    expect(result.post).toMatchObject({ excerpt: "새 본문", featuredOrder: 1 });
    expect(result.sha).toMatch(/^[a-f0-9]{40}$/);
    expect(parsePostFile(files.get("content/posts/b.md")!, "b")).toMatchObject({
      body: second.body,
      featuredOrder: 0,
      lastEditedAt: second.lastEditedAt,
    });
    expect(state.treeInput!.tree.some(({ path }) => path === INDEX_PATH)).toBe(
      true,
    );
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(1);
    expect(
      (await getPosts()).posts.find(({ slug }) => slug === "b")?.featuredOrder,
    ).toBe(0);
  });
  it("unpins selected posts without changing their body", async () => {
    const { files } = githubStore([first, second]);
    await savePost("a", first, blobSha(serializePostFile(first)), {
      base: ["a", "b"],
      order: ["a"],
    });
    expect(parsePostFile(files.get("content/posts/b.md")!, "b")).toMatchObject({
      body: second.body,
      featured: false,
    });
  });
  it("rejects stale/duplicate/unknown pinned lists and invalid base trees before writes", async () => {
    const { state, fetchMock } = githubStore([first, second]);
    for (const pinned of [
      { base: ["b", "a"], order: ["a", "b"] },
      { base: ["a", "b"], order: ["b"] },
      { base: ["a", "b"], order: ["a", "a"] },
      { base: ["a", "b"], order: ["a", "unknown"] },
    ])
      await expect(
        savePost("a", first, blobSha(serializePostFile(first)), pinned),
      ).rejects.toMatchObject({ status: pinned.base[0] === "b" ? 409 : 400 });
    state.invalidTree = true;
    await expect(
      savePost("a", first, blobSha(serializePostFile(first)), {
        base: ["a", "b"],
        order: ["b", "a"],
      }),
    ).rejects.toMatchObject({ status: 502 });
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method)).toBe(true);
  });
});

it("splits large search groups into bounded cache entries even with long Korean bodies", () => {
  const posts: FilePost[] = [];
  for (let index = 0; posts.length < 3; index++) {
    const slug = `post-${index + 1}`;
    if (indexBucket(slug) === indexBucket("a"))
      posts.push({
        ...sample,
        slug,
        id: slug,
        body: "한".repeat(200_000),
        excerpt: "한",
      });
  }
  const search = buildChunks("search", posts.map(searchDocument));
  expect(search.refs).toHaveLength(3);
  for (const file of search.files) {
    expect(
      Buffer.byteLength(JSON.stringify(decodeChunk(file.content))),
    ).toBeLessThanOrEqual(750_000);
    expect(file.path).toBe(chunkPath("search", blobSha(file.content)));
  }
});
