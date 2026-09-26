import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import {
  parsePostFile,
  serializePostFile,
  type StoredPost,
} from "@/lib/content/post-file";
import {
  getAllPosts,
  getPosts,
  savePost,
  deletePost,
  getStoredPosts,
  getStoredPostsWithSha,
} from "./posts";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("./comment-counts", () => ({
  withCommentCounts: (posts: unknown) => posts,
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
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Markdown store", () => {
  it("reads all sequential posts and paginates globally", async () => {
    const posts = await getAllPosts();
    expect(posts.length).toBe(8);
    expect(new Set(posts.map((post) => post.slug))).toEqual(
      new Set(Array.from({ length: 8 }, (_, index) => `post-${index + 1}`)),
    );
    const first = await getPosts({ first: 2, sort: "oldest" });
    const second = await getPosts({
      first: 2,
      after: first.pageInfo.endCursor!,
      sort: "oldest",
    });
    expect(
      new Set([...first.posts, ...second.posts].map((p) => p.slug)).size,
    ).toBe(4);
    expect(first.posts[0].createdAt <= first.posts[1].createdAt).toBe(true);
  });
  it("all committed Markdown parses without altering its body", async () => {
    for (const name of await readdir("tests/fixtures/posts")) {
      if (!name.endsWith(".md")) continue;
      const original = await readFile(`tests/fixtures/posts/${name}`, "utf8");
      const parsed = parsePostFile(original, name.slice(0, -3));
      expect(parsePostFile(serializePostFile(parsed), parsed.slug).body).toBe(
        parsed.body,
      );
    }
  });
  it("uses SHA preconditions for changes and refuses remote-to-local fallback", async () => {
    vi.stubEnv("CONTENT_SOURCE", "github");
    vi.stubEnv("GITHUB_OWNER", "owner");
    vi.stubEnv("GITHUB_REPO", "repo");
    vi.stubEnv("GITHUB_TOKEN", "test");
    vi.stubEnv("GITHUB_CONTENT_BRANCH", "content");
    const fetchMock = vi.fn().mockImplementation(async () =>
      Response.json({
        type: "file",
        encoding: "base64",
        sha: "current",
        content: Buffer.from(serializePostFile(sample)).toString("base64"),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(savePost("a", sample, "stale")).rejects.toMatchObject({
      status: 409,
    });
    await expect(savePost("a", sample, null)).rejects.toMatchObject({
      status: 409,
    });
    await expect(deletePost("a", "stale")).rejects.toMatchObject({
      status: 409,
    });
    expect(fetchMock.mock.calls.every(([, init]) => !init.method)).toBe(true);
    fetchMock.mockImplementation(
      async () => new Response(null, { status: 404 }),
    );
    await expect(getStoredPosts()).rejects.toMatchObject({ status: 503 });
  });
  it("treats a missing posts directory on an existing branch as an empty blog", async () => {
    for (const [key, value] of Object.entries({
      CONTENT_SOURCE: "github",
      GITHUB_OWNER: "owner",
      GITHUB_REPO: "repo",
      GITHUB_TOKEN: "test",
      GITHUB_CONTENT_BRANCH: "content",
    }))
      vi.stubEnv(key, value);
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("/git/ref/heads/content")
        ? Response.json({ object: { sha: "a".repeat(40) } })
        : new Response(null, { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await getStoredPostsWithSha()).toEqual([]);
    expect(await getAllPosts()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/git/ref/heads/content"),
      expect.any(Object),
    );
  });
  it("treats a missing local posts directory as empty", async () => {
    vi.stubEnv("LOCAL_CONTENT_PATH", "tests/fixtures/no-posts-directory");
    expect(await getStoredPostsWithSha()).toEqual([]);
  });
  it("writes only the chosen slug with the supplied SHA and preserves immutable metadata", async () => {
    vi.stubEnv("CONTENT_SOURCE", "github");
    vi.stubEnv("GITHUB_OWNER", "owner");
    vi.stubEnv("GITHUB_REPO", "repo");
    vi.stubEnv("GITHUB_TOKEN", "test");
    vi.stubEnv("GITHUB_CONTENT_BRANCH", "content");
    const old = sample;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          type: "file",
          encoding: "base64",
          sha: "current",
          content: Buffer.from(serializePostFile(old)).toString("base64"),
        }),
      )
      .mockResolvedValueOnce(Response.json({ content: { sha: "next" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await savePost(
      "a",
      { ...old, title: "changed", id: "forged" },
      "current",
    );
    expect(result.post).toMatchObject({
      id: old.id,
      createdAt: old.createdAt,
      title: "changed",
      excerpt: "body",
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      sha: "current",
      branch: "content",
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.github.com/repos/owner/repo/contents/content/posts/a.md",
    );
  });
});

describe("atomic pinned ordering", () => {
  const head = "a".repeat(40),
    tree = "b".repeat(40),
    next = "c".repeat(40);
  const first = { ...sample, featured: true, featuredOrder: 0 };
  const second = {
    ...sample,
    slug: "b",
    id: "b",
    featured: true,
    featuredOrder: 1,
    body: "# 원문\n\n그대로 보존\n",
  };
  let conflict: boolean;
  let invalidTree: boolean;
  let treeInput: {
    base_tree: string;
    tree: { path: string; content: string }[];
  };
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    for (const [key, value] of Object.entries({
      CONTENT_SOURCE: "github",
      GITHUB_OWNER: "owner",
      GITHUB_REPO: "repo",
      GITHUB_TOKEN: "test",
      GITHUB_CONTENT_BRANCH: "content",
    }))
      vi.stubEnv(key, value);
    conflict = false;
    invalidTree = false;
    fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      const pathname = new URL(url).pathname.replace("/repos/owner/repo", "");
      if (pathname === "/git/ref/heads/content")
        return Response.json({ object: { sha: head } });
      if (pathname === `/git/commits/${head}`)
        return Response.json({ tree: invalidTree ? {} : { sha: tree } });
      if (pathname === "/contents/content/posts")
        return Response.json(
          ["a", "b"].map((slug) => ({ type: "file", name: `${slug}.md` })),
        );
      if (pathname.startsWith("/contents/content/posts/")) {
        expect(new URL(url).searchParams.get("ref")).toBe(head);
        const post = pathname.endsWith("/a.md") ? first : second;
        return Response.json({
          type: "file",
          encoding: "base64",
          sha: head,
          content: Buffer.from(serializePostFile(post)).toString("base64"),
        });
      }
      if (pathname === "/git/trees") {
        treeInput = JSON.parse(init.body as string);
        return Response.json({ sha: tree });
      }
      if (pathname === "/git/commits") {
        expect(JSON.parse(init.body as string)).toMatchObject({
          parents: [head],
          tree,
        });
        return Response.json({ sha: next });
      }
      if (pathname === "/git/refs/heads/content") {
        expect(init.method).toBe("PATCH");
        expect(JSON.parse(init.body as string)).toEqual({
          sha: next,
          force: false,
        });
        return conflict
          ? new Response(null, { status: 422 })
          : Response.json({ object: { sha: next } });
      }
      throw new Error(`Unexpected request: ${pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });
  it("commits edited content and all changed ranks together, preserving other bodies and the base tree", async () => {
    const result = await savePost(
      "a",
      {
        ...first,
        title: "수정",
        body: "새 **본문**",
      },
      head,
      { base: ["a", "b"], order: ["b", "a"] },
    );
    expect(result.post).toMatchObject({
      slug: "a",
      excerpt: "새 본문",
      featuredOrder: 1,
    });
    expect(result.sha).toMatch(/^[a-f0-9]{40}$/);
    expect(treeInput.base_tree).toBe(tree);
    expect(treeInput.tree).toHaveLength(2);
    expect(
      parsePostFile(
        treeInput.tree.find((entry) => entry.path === "content/posts/b.md")!
          .content,
        "b",
      ),
    ).toMatchObject({
      body: second.body,
      featuredOrder: 0,
      lastEditedAt: second.lastEditedAt,
    });
    expect(
      fetchMock.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(1);
  });
  it("unpins a selected post in the same commit", async () => {
    const result = await savePost("a", first, head, {
      base: ["a", "b"],
      order: ["a"],
    });
    expect(result.pinned).toEqual(["a"]);
    expect(
      parsePostFile(
        treeInput.tree.find((entry) => entry.path === "content/posts/b.md")!
          .content,
        "b",
      ),
    ).toMatchObject({
      body: second.body,
      featured: false,
    });
  });
  it("rejects stale lists, duplicate/unknown cards and unsafe base trees before any writes", async () => {
    for (const pinned of [
      { base: ["b", "a"], order: ["a", "b"] },
      { base: ["a", "b"], order: ["b"] },
      { base: ["a", "b"], order: ["a", "a"] },
      { base: ["a", "b"], order: ["a", "unknown"] },
    ]) {
      await expect(savePost("a", first, head, pinned)).rejects.toMatchObject({
        status: pinned.base[0] === "b" ? 409 : 400,
      });
    }
    invalidTree = true;
    await expect(
      savePost("a", first, head, { base: ["a", "b"], order: ["b", "a"] }),
    ).rejects.toMatchObject({ status: 502 });
    expect(fetchMock.mock.calls.every(([, init]) => !init.method)).toBe(true);
  });
  it("refuses a concurrent branch update without force-pushing or retrying", async () => {
    conflict = true;
    await expect(
      savePost("a", first, head, { base: ["a", "b"], order: ["b", "a"] }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      fetchMock.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(1);
  });
});
