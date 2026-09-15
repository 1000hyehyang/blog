import { readFile } from "node:fs/promises";
import { afterEach, expect, it, vi } from "vitest";
import { parsePostFile } from "@/lib/content/post-file";
import { withCommentCounts } from "./comment-counts";

vi.mock("server-only", () => ({}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("refreshes pathname counts without reading post bodies; outages preserve articles", async () => {
  const first = parsePostFile(
    await readFile("tests/fixtures/posts/post-1.md", "utf8"),
    "post-1",
  );
  const second = { ...first, id: "post-2", slug: "post-2" };
  vi.stubEnv("NEXT_PUBLIC_GISCUS_REPO", "owner/comments");
  vi.stubEnv("NEXT_PUBLIC_GISCUS_CATEGORY_ID", "category");
  vi.stubEnv("GITHUB_TOKEN", "test");
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      data: {
        repository: {
          discussions: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                title: "/posts/post-1",
                category: { id: "category" },
                comments: { totalCount: 12 },
                reactions: { totalCount: 7 },
              },
              {
                title: "/posts/post-2",
                category: { id: "category" },
                comments: { totalCount: 3 },
                reactions: { totalCount: 2 },
              },
              {
                title: "/posts/post-2-suffix",
                category: { id: "category" },
                comments: { totalCount: 99 },
                reactions: { totalCount: 99 },
              },
            ],
          },
        },
      },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(await withCommentCounts([first, second])).toEqual([
    { ...first, commentsCount: 12, reactionsCount: 7 },
    { ...second, commentsCount: 3, reactionsCount: 2 },
  ]);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).query).not.toMatch(
    /\bbody\b/,
  );
  fetchMock.mockRejectedValue(new Error("offline"));
  expect(await withCommentCounts([first])).toEqual([first]);
});
