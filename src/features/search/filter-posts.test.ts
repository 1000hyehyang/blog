import { describe, expect, it } from "vitest";

import { filterPosts } from "./filter-posts";

describe("filterPosts", () => {
  const posts = [
    {
      number: 1,
      title: "Next.js App Router",
      excerpt: "라우팅 정리",
      body: "서버 컴포넌트 설명",
      category: "Development",
      tags: ["Next.js"],
    },
  ];

  it("제목과 태그로 포스트를 필터링한다", () => {
    expect(filterPosts(posts, "next.js")).toHaveLength(1);
    expect(filterPosts(posts, "없는 검색어")).toHaveLength(0);
  });
});
