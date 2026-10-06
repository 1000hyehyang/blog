import { afterEach, expect, it, vi } from "vitest";

import { getAllPosts } from "@/infrastructure/github/posts";
import type { PostSummary } from "@/domain/post";
import { generateMetadata as categoryMetadata } from "./[category]/page";
import { generateMetadata as seriesMetadata } from "./[category]/series/[series]/page";

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/github/posts", () => ({
  getAllPosts: vi.fn(),
  getPosts: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());

it("switches empty categories and series back to indexable when a public post appears", async () => {
  const props = {
    params: Promise.resolve({ category: "essay", series: "life-updates" }),
    searchParams: Promise.resolve({}),
  };
  const post: PostSummary = {
    id: "post-1",
    slug: "post-1",
    title: "Post",
    excerpt: "Summary",
    category: { name: "Essay", slug: "essay" },
    series: "life-updates",
    coverImage: { src: "" },
    tags: [],
    featured: false,
    published: true,
    createdAt: "2026-01-01T00:00:00Z",
    lastEditedAt: null,
    commentsCount: 0,
    reactionsCount: 0,
  };
  for (const metadata of [categoryMetadata, seriesMetadata]) {
    vi.mocked(getAllPosts).mockResolvedValue([]);
    expect((await metadata(props)).robots).toEqual({
      index: false,
      follow: true,
    });
    vi.mocked(getAllPosts).mockResolvedValue([post]);
    expect((await metadata(props)).robots).toBeUndefined();
    vi.mocked(getAllPosts).mockResolvedValue([]);
    expect((await metadata(props)).robots).toEqual({
      index: false,
      follow: true,
    });
  }
});
