import { afterEach, expect, it, vi } from "vitest";
import { POST_BODY_MAX_BYTES, type StoredPost } from "@/domain/post";
import {
  POST_HTTP_MAX_BYTES,
  POST_METADATA_MAX_BYTES,
} from "@/lib/post-transfer";
import { deletePostRequest, savePostRequest } from "./post-api";

const post: StoredPost = {
  id: "a",
  slug: "a",
  title: "Title",
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
const pinned = { base: [], order: [] };
afterEach(() => vi.unstubAllGlobals());

it.each([0, 1])(
  "keeps every HTTP request bounded at the transfer threshold (+%s byte)",
  async (extra) => {
    const overhead = JSON.stringify({
      post: { ...post, body: "" },
      sha: null,
      pinned,
    }).length;
    const body = "x".repeat(POST_HTTP_MAX_BYTES - overhead + extra);
    const methods: string[] = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect(
        new TextEncoder().encode(init.body as string).byteLength,
      ).toBeLessThanOrEqual(POST_HTTP_MAX_BYTES);
      methods.push(init.method!);
      if (init.method === "POST") return Response.json({ sha: "a".repeat(40) });
      return Response.json({
        post: { ...post, title: "Canonical title", body: undefined },
        sha: "b".repeat(40),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await savePostRequest(
      post.slug,
      { ...post, body },
      null,
      pinned,
    );
    expect(result).toMatchObject({
      ok: true,
      post: { body, title: "Canonical title" },
    });
    expect(methods.at(-1)).toBe("PUT");
    expect(methods.length).toBe(extra === 0 ? 1 : 4);
  },
);

it.each([413, 502])(
  "handles a non-JSON %s response without discarding the editor's content",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Upstream error", { status })),
    );
    const result = await savePostRequest(post.slug, post, null, pinned);
    expect(result).toMatchObject({
      ok: false,
      status,
      message: expect.stringContaining("유지"),
    });
    expect(post.body).toBe("body");
  },
);

it("validates content and metadata budgets before starting any upload", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    savePostRequest(
      post.slug,
      { ...post, body: "x".repeat(POST_BODY_MAX_BYTES + 1) },
      null,
      pinned,
    ),
  ).rejects.toThrow("5 MiB");
  await expect(
    savePostRequest(
      post.slug,
      {
        ...post,
        coverImage: {
          src: `https://example.com/${"x".repeat(POST_METADATA_MAX_BYTES)}`,
        },
      },
      null,
      pinned,
    ),
  ).rejects.toThrow("글 설정 정보");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("stops before publishing if the chunk receipt is malformed", async () => {
  const fetchMock = vi
    .fn<(url: string, init: RequestInit) => Promise<Response>>()
    .mockResolvedValue(Response.json({ sha: "not-a-version" }));
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    savePostRequest(
      post.slug,
      { ...post, body: "x".repeat(POST_BODY_MAX_BYTES) },
      null,
      pinned,
    ),
  ).rejects.toThrow("작성 내용은 유지");
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
});

it("keeps a useful deletion error when the upstream response is not JSON", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("Unavailable", { status: 502 })),
  );
  await expect(deletePostRequest(post.slug, "a".repeat(40))).rejects.toThrow(
    "글을 삭제하지 못했습니다.",
  );
});
