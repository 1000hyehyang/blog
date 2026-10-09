import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { readWriterJson, writerRequest } from "./writer-api";
import { POST_BODY_MAX_BYTES, postFieldsSchema } from "@/domain/post";
import { PostStoreError, gitJson } from "@/infrastructure/github/post-store";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("./writer-auth", () => ({
  isWriter: vi.fn(() => true),
  sameOrigin: vi.fn(() => true),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("accepts large Korean text and the worst JSON escaping within the body byte limit", async () => {
  for (const body of [
    "가".repeat(Math.floor(POST_BODY_MAX_BYTES / 3)),
    "\u0000".repeat(POST_BODY_MAX_BYTES),
  ]) {
    const raw = JSON.stringify({ post: { body } });
    const parsed = await readWriterJson(
      new Request("http://localhost/api/write/posts/post-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: raw,
      }),
    );
    expect(parsed).toEqual({ post: { body } });
    expect(postFieldsSchema.shape.body.safeParse(body).success).toBe(true);
  }
  expect(
    postFieldsSchema.shape.body.safeParse(
      "가".repeat(Math.floor(POST_BODY_MAX_BYTES / 3) + 1),
    ).success,
  ).toBe(false);
  expect(
    postFieldsSchema.shape.body.safeParse("a".repeat(POST_BODY_MAX_BYTES + 1))
      .success,
  ).toBe(false);
}, 30_000);

it("preserves small endpoint limits and rejects oversized chunked requests", async () => {
  await expect(
    readWriterJson(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "x".repeat(4096) }),
      }),
      4096,
    ),
  ).rejects.toMatchObject({ status: 400 });
});

it("logs validation and storage failures without request bodies, URLs or exception messages", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const request = new Request(
    "http://localhost/api/write/posts/secret-title?token=secret",
    { method: "PUT" },
  );
  const invalid = z
    .object({ body: z.number() })
    .safeParse({ body: "private content" });
  await writerRequest(request, async () => {
    if (!invalid.success) throw invalid.error;
  });
  await writerRequest(request, async () => {
    throw new Error("secret-token private content");
  });
  await writerRequest(request, async () => {
    throw new PostStoreError("conflict", 409);
  });
  expect(log).toHaveBeenCalledTimes(3);
  expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret|private content/);
  expect(log.mock.calls[0][1]).toMatchObject({
    status: 400,
    reason: "validation",
    fields: ["body"],
  });
});

it("logs GitHub failure stages, statuses and request IDs while excluding tokens and bodies", async () => {
  for (const [key, value] of Object.entries({
    GITHUB_OWNER: "owner",
    GITHUB_REPO: "repo",
    GITHUB_CONTENT_BRANCH: "content",
    GITHUB_TOKEN: "secret-token",
  }))
    vi.stubEnv(key, value);
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response("private content", {
          status: 403,
          headers: { "x-github-request-id": "ABCD:1234", "retry-after": "60" },
        }),
      )
      .mockRejectedValueOnce(new Error("secret-token")),
  );
  await expect(
    gitJson("/git/trees", { method: "POST", body: "private content" }),
  ).rejects.toMatchObject({ status: 502 });
  await expect(gitJson("/git/trees")).rejects.toMatchObject({ status: 502 });
  expect(log.mock.calls[0][1]).toMatchObject({
    operation: "git/trees",
    status: 403,
    requestId: "ABCD:1234",
  });
  expect(log.mock.calls[1][1]).toMatchObject({
    operation: "git/trees",
    reason: "network",
  });
  expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret|private content/);
});
