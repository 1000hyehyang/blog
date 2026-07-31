import { describe, expect, it } from "vitest";

import type { Post } from "@/domain/post";

import { getFeaturedPosts, getRelatedPosts } from "./post-queries";

const basePost = (
  overrides: Partial<Post> & Pick<Post, "number" | "category">,
): Post => ({
  id: `D_${overrides.number}`,
  slug: `post-${overrides.number}`,
  title: `포스트 ${overrides.number}`,
  body: "본문",
  excerpt: "요약",
  coverImage: "/og-default.png",
  featured: false,
  published: true,
  tags: [],
  author: { login: "author", avatarUrl: "", url: "https://github.com/author" },
  createdAt: "2026-07-20T00:00:00Z",
  lastEditedAt: null,
  commentsCount: 0,
  reactionsCount: 0,
  url: "https://github.com/example/discussions/1",
  ...overrides,
});

describe("featured 포스트 선택", () => {
  it("featuredOrder가 같으면 최근 작성 순으로 정렬한다", () => {
    const first = basePost({
      number: 1,
      featured: true,
      featuredOrder: 1,
      createdAt: "2026-07-20T00:00:00Z",
      category: { id: "C_1", name: "Development", slug: "development" },
    });
    const second = basePost({
      number: 2,
      featured: true,
      featuredOrder: 1,
      createdAt: "2026-07-22T00:00:00Z",
      category: { id: "C_1", name: "Development", slug: "development" },
    });

    expect(getFeaturedPosts([first, second])).toEqual([second, first]);
  });
});

describe("관련 포스트 선택", () => {
  it("랭킹 정책에 limit을 전달한다", () => {
    const current = basePost({
      number: 1,
      category: { id: "C_1", name: "Development", slug: "development" },
    });
    const second = basePost({
      number: 2,
      category: { id: "C_1", name: "Development", slug: "development" },
    });
    const third = basePost({
      number: 3,
      category: { id: "C_1", name: "Development", slug: "development" },
    });

    expect(getRelatedPosts([current, second, third], current, 1)).toHaveLength(
      1,
    );
  });
});
