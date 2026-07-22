import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Post } from "@/domain/post";
import { FeaturedPosts } from "@/features/post/featured-posts";
import { EmptyState, PostCard } from "@/features/post/post-card";
import { SearchResults } from "@/features/search/search-results";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const post: Post = {
  id: "D_1",
  number: 1,
  slug: "first-post",
  title: "첫 번째 Next.js 게시글",
  body: "서버 컴포넌트 본문",
  excerpt: "첫 번째 게시글 요약",
  coverImage: "/default-cover.svg",
  featured: true,
  featuredOrder: 1,
  published: true,
  tags: ["Next.js"],
  category: { id: "C_1", name: "Development", slug: "development" },
  author: { login: "author", avatarUrl: "", url: "https://github.com/author" },
  createdAt: "2026-07-20T00:00:00Z",
  updatedAt: "2026-07-22T00:00:00Z",
  commentsCount: 2,
  reactionsCount: 3,
  url: "https://github.com/example/discussions/1",
};

afterEach(() => cleanup());

describe("게시글 UI", () => {
  it("PostCard에 핵심 게시글 정보를 표시한다", () => {
    render(<PostCard post={post} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/posts/1");
    expect(screen.getByText(post.title)).toBeVisible();
    expect(screen.getByText("Development")).toBeVisible();
  });

  it("FeaturedPosts의 다음 게시글로 이동한다", () => {
    const second = { ...post, id: "D_2", number: 2, title: "두 번째 게시글" };
    render(<FeaturedPosts posts={[post, second]} />);
    fireEvent.click(screen.getByRole("button", { name: "다음 고정 게시글" }));
    expect(screen.getByText("두 번째 게시글")).toBeVisible();
  });

  it("EmptyState 안내를 표시한다", () => {
    render(<EmptyState title="결과 없음" description="다시 검색하세요." />);
    expect(screen.getByRole("heading", { name: "결과 없음" })).toBeVisible();
  });
});

describe("검색과 테마 UI", () => {
  it("SearchField 입력으로 게시글을 필터링한다", () => {
    render(<SearchResults posts={[post]} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Next.js" },
    });
    expect(screen.getByText(post.title)).toBeVisible();
  });

  it("ThemeToggle이 문서 테마를 변경한다", async () => {
    const { SiteHeader } = await import("@/components/site-chrome");
    document.documentElement.classList.remove("dark");
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: "다크 모드로 전환" }));
    expect(document.documentElement).toHaveClass("dark");
  });
});
