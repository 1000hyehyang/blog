import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Post } from "@/domain/post";
import { getPosts } from "@/infrastructure/github/github";

import sitemap from "./sitemap";

vi.mock("@/infrastructure/github/github", () => ({ getPosts: vi.fn() }));

const post = (
  number: number,
  category: string,
  createdAt: string,
  lastEditedAt: string | null = null,
): Post => ({
  id: `post-${number}`,
  number,
  title: `Post ${number}`,
  body: "",
  excerpt: "",
  coverImage: { src: "" },
  featured: false,
  published: true,
  tags: [],
  category: { name: category, slug: category },
  createdAt,
  lastEditedAt,
  commentsCount: 0,
  reactionsCount: 0,
});

describe("sitemap", () => {
  beforeEach(() => {
    vi.mocked(getPosts).mockReset();
  });

  it("loads every post page and uses content modification dates", async () => {
    vi.mocked(getPosts)
      .mockResolvedValueOnce({
        posts: [
          post(1, "development", "2026-01-01T00:00:00.000Z"),
          post(
            2,
            "development",
            "2026-01-02T00:00:00.000Z",
            "2026-01-04T00:00:00.000Z",
          ),
        ],
        pageInfo: { hasNextPage: true, endCursor: "page-2" },
      })
      .mockResolvedValueOnce({
        posts: [post(3, "art", "2026-01-03T00:00:00.000Z")],
        pageInfo: { hasNextPage: false, endCursor: null },
      });

    const entries = await sitemap();
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

    expect(getPosts).toHaveBeenNthCalledWith(1, {
      first: 50,
      after: undefined,
    });
    expect(getPosts).toHaveBeenNthCalledWith(2, {
      first: 50,
      after: "page-2",
    });
    expect(byUrl.has("http://localhost:3000/posts/3")).toBe(true);

    expect(byUrl.get("http://localhost:3000")?.lastModified).toEqual(
      new Date("2026-01-04T00:00:00.000Z"),
    );
    expect(byUrl.get("http://localhost:3000/posts")?.lastModified).toEqual(
      new Date("2026-01-04T00:00:00.000Z"),
    );
    expect(
      byUrl.get("http://localhost:3000/category/development")?.lastModified,
    ).toEqual(new Date("2026-01-04T00:00:00.000Z"));
    expect(
      byUrl.get("http://localhost:3000/category/art")?.lastModified,
    ).toEqual(new Date("2026-01-03T00:00:00.000Z"));
    expect(
      byUrl.get("http://localhost:3000/category/study"),
    ).not.toHaveProperty("lastModified");
    expect(byUrl.get("http://localhost:3000/posts/1")?.lastModified).toEqual(
      new Date("2026-01-01T00:00:00.000Z"),
    );
    expect(byUrl.get("http://localhost:3000/posts/2")?.lastModified).toEqual(
      new Date("2026-01-04T00:00:00.000Z"),
    );
  });
});
