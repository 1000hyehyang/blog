import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Post } from "@/domain/post";
import { siteConfig } from "@/config/site";
import { getAllPosts } from "@/infrastructure/github/posts";

import sitemap from "./sitemap";

vi.mock("@/infrastructure/github/posts", () => ({ getAllPosts: vi.fn() }));

const post = (
  number: number,
  category: string,
  createdAt: string,
  lastEditedAt: string | null = null,
): Post => ({
  id: `article-${number}`,
  slug: `post-${number}`,
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
    expect(byUrl.has(`${siteConfig.url}/article-3`)).toBe(true);

    for (const url of [
      siteConfig.url,
      `${siteConfig.url}/posts`,
      `${siteConfig.url}/category/development`,
      `${siteConfig.url}/category/art`,
    ])
      expect(byUrl.get(url)).toEqual({ url });
    expect(byUrl.has(`${siteConfig.url}/category/study`)).toBe(false);
    expect(
      byUrl.has(`${siteConfig.url}/category/essay/series/life-updates`),
    ).toBe(false);
    expect(byUrl.get(`${siteConfig.url}/article-1`)?.lastModified).toEqual(
      "2026-01-01T00:00:00.000Z",
    );
    expect(byUrl.get(`${siteConfig.url}/article-2`)?.lastModified).toEqual(
      "2026-01-04T00:00:00.000Z",
    );
  });
  it("adds a category and series on publication and removes them with the last public post", async () => {
    const article = {
      ...post(1, "essay", "2026-01-01T00:00:00Z"),
      series: "life-updates",
      publishedAt: "2026-02-01T00:00:00Z",
    };
    vi.mocked(getAllPosts).mockResolvedValue([article]);
    const entries = await sitemap();
    expect(entries).toContainEqual({ url: `${siteConfig.url}/category/essay` });
    expect(entries).toContainEqual({
      url: `${siteConfig.url}/category/essay/series/life-updates`,
    });
    expect(entries).toContainEqual({
      url: `${siteConfig.url}/article-1`,
      lastModified: article.publishedAt,
    });
    vi.mocked(getAllPosts).mockResolvedValue([]);
    expect(await sitemap()).toEqual([
      { url: siteConfig.url },
      { url: `${siteConfig.url}/posts` },
    ]);
  });
});
