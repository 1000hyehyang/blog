import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAllPosts, getPosts } from "./github";

const discussion = {
  id: "discussion-1",
  number: 1,
  title: "Post",
  body: "---\npublished: true\ntags: []\n---\nBody",
  author: { login: "owner" },
  createdAt: "2026-01-01T00:00:00Z",
  lastEditedAt: null,
  category: { name: "Development" },
  comments: { totalCount: 0 },
  reactionGroups: [],
};

beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "token");
  vi.stubEnv("GITHUB_OWNER", "owner");
  vi.stubEnv("GITHUB_REPO", "blog");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GitHub posts", () => {
  it("requests the selected global sort direction", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          repository: {
            discussions: {
              nodes: [discussion],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getPosts({ sort: "oldest" });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body)).variables.direction).toBe("ASC");
  });

  it("does not publish discussions written by another account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: {
            repository: {
              discussions: {
                nodes: [
                  { ...discussion, author: { login: "visitor" } },
                  discussion,
                ],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
        }),
      ),
    );

    await expect(getPosts()).resolves.toMatchObject({
      posts: [{ number: 1, published: true }],
    });
  });

  it("loads every page when all posts are requested", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: {
            repository: {
              discussions: {
                nodes: [discussion],
                pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
              },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            repository: {
              discussions: {
                nodes: [{ ...discussion, id: "discussion-2", number: 2 }],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAllPosts()).resolves.toHaveLength(2);
    const secondRequest = fetchMock.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(String(secondRequest.body)).variables.after).toBe(
      "cursor-1",
    );
  });
});
