import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Post } from "@/domain/post";
import { getAllPosts } from "@/infrastructure/github/github";

import sitemap from "./sitemap";

vi.mock("@/infrastructure/github/github", () => ({ getAllPosts: vi.fn() }));

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
    vi.mocked(getAllPosts).mockReset();
  });

  it("loads every post page and uses content modification dates", async () => {
    vi.mocked(getAllPosts).mockResolvedValue([
      post(1, "development", "2026-01-01T00:00:00.000Z"),
      post(
        2,
        "development",
        "2026-01-02T00:00:00.000Z",
        "2026-01-04T00:00:00.000Z",
      ),
      post(3, "art", "2026-01-03T00:00:00.000Z"),
    ]);

    const entries = await sitemap();
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

    expect(getAllPosts).toHaveBeenCalledOnce();
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
