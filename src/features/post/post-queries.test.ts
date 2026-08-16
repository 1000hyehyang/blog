import { describe, expect, it } from "vitest";

import type { Post } from "@/domain/post";

import {
  getFeaturedPosts,
  getRecentArtPosts,
  getRecentPosts,
  getRelatedPosts,
  toPostPreview,
} from "./post-queries";

const basePost = (
  overrides: Partial<Post> & Pick<Post, "number" | "category">,
): Post => ({
  id: `D_${overrides.number}`,
  title: `포스트 ${overrides.number}`,
  body: "본문",
  excerpt: "요약",
  coverImage: {
    src: "/og-default.png",
  },
  featured: false,
  published: true,
  tags: [],
  createdAt: "2026-07-20T00:00:00Z",
  lastEditedAt: null,
  commentsCount: 0,
  reactionsCount: 0,
  ...overrides,
});

describe("featured 포스트 선택", () => {
  it("featuredOrder가 같으면 최근 작성 순으로 정렬한다", () => {
    const first = basePost({
      number: 1,
      featured: true,
      featuredOrder: 1,
      createdAt: "2026-07-20T00:00:00Z",
      category: { name: "Development", slug: "development" },
    });
    const second = basePost({
      number: 2,
      featured: true,
      featuredOrder: 1,
      createdAt: "2026-07-22T00:00:00Z",
      category: { name: "Development", slug: "development" },
    });

    expect(getFeaturedPosts([first, second])).toEqual([second, first]);
  });

  it("클라이언트 캐러셀에는 본문을 제외한 미리보기 데이터만 전달한다", () => {
    const post = basePost({
      number: 1,
      category: { name: "Development", slug: "development" },
    });

    expect(toPostPreview(post)).not.toHaveProperty("body");
    expect(toPostPreview(post)).toMatchObject({
      id: post.id,
      title: post.title,
      coverImage: post.coverImage,
    });
  });
});

describe("홈 최근 포스트 선택", () => {
  const development = { name: "Development", slug: "development" };
  const art = { name: "Art", slug: "art" };

  it("Art를 제외한 뒤 요청한 개수만큼 최근 포스트를 채운다", () => {
    const posts = [
      basePost({ number: 1, category: art }),
      basePost({ number: 2, category: development }),
      basePost({ number: 3, category: art }),
      basePost({ number: 4, category: development }),
    ];

    expect(getRecentPosts(posts, 2).map((post) => post.number)).toEqual([2, 4]);
  });

  it("최근 Art만 요청한 개수만큼 선택한다", () => {
    const posts = [
      basePost({ number: 1, category: art }),
      basePost({ number: 2, category: development }),
      basePost({ number: 3, category: art }),
    ];

    expect(getRecentArtPosts(posts, 1).map((post) => post.number)).toEqual([1]);
  });
});

describe("관련 포스트 선택", () => {
  it("랭킹 정책에 limit을 전달한다", () => {
    const current = basePost({
      number: 1,
      category: { name: "Development", slug: "development" },
    });
    const second = basePost({
      number: 2,
      category: { name: "Development", slug: "development" },
    });
    const third = basePost({
      number: 3,
      category: { name: "Development", slug: "development" },
    });

    expect(getRelatedPosts([current, second, third], current, 1)).toHaveLength(
      1,
    );
  });
});
