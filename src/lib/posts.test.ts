import { describe, expect, it } from "vitest";

import type { Post } from "@/domain/post";
import { getFeaturedPosts, getRelatedPosts } from "./posts";

const basePost = (overrides: Partial<Post> & Pick<Post, "number" | "category">): Post => ({
  id: `D_${overrides.number}`,
  slug: `post-${overrides.number}`,
  title: `게시글 ${overrides.number}`,
  body: "본문",
  excerpt: "요약",
  coverImage: "/default-cover.svg",
  featured: false,
  published: true,
  tags: [],
  author: { login: "author", avatarUrl: "", url: "https://github.com/author" },
  createdAt: "2026-07-20T00:00:00Z",
  updatedAt: "2026-07-22T00:00:00Z",
  commentsCount: 0,
  reactionsCount: 0,
  url: "https://github.com/example/discussions/1",
  ...overrides,
});

describe("featured 게시글 선택", () => {
  it("featuredOrder가 같으면 최근 수정 순으로 정렬한다", () => {
    const first = basePost({
      number: 1,
      featured: true,
      featuredOrder: 1,
      updatedAt: "2026-07-20T00:00:00Z",
      category: { id: "C_1", name: "Development", slug: "development" },
    });
    const second = basePost({
      number: 2,
      featured: true,
      featuredOrder: 1,
      updatedAt: "2026-07-22T00:00:00Z",
      category: { id: "C_1", name: "Development", slug: "development" },
    });

    expect(getFeaturedPosts([first, second])).toEqual([second, first]);
  });
});

describe("관련 게시글 선택", () => {
  it("현재 글을 제외하고 같은 카테고리를 우선한다", () => {
    const current = basePost({
      number: 1,
      category: { id: "C_1", name: "Development", slug: "development" },
    });
    const sameCategory = basePost({
      number: 2,
      category: { id: "C_1", name: "Development", slug: "development" },
    });
    const otherCategory = basePost({
      number: 3,
      category: { id: "C_2", name: "Study", slug: "study" },
    });

    expect(
      getRelatedPosts([current, sameCategory, otherCategory], current, 1),
    ).toEqual([sameCategory]);
  });

  it("같은 카테고리가 부족하면 다른 카테고리로 채운다", () => {
    const current = basePost({
      number: 1,
      category: { id: "C_1", name: "Development", slug: "development" },
    });
    const first = basePost({
      number: 2,
      category: { id: "C_1", name: "Development", slug: "development" },
    });
    const second = basePost({
      number: 3,
      category: { id: "C_2", name: "Study", slug: "study" },
    });
    const third = basePost({
      number: 4,
      category: { id: "C_3", name: "CS", slug: "cs" },
    });

    expect(
      getRelatedPosts([current, first, second, third], current, 3),
    ).toEqual([first, second, third]);
  });
});
