import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Post } from "@/domain/post";
import { FeaturedPosts } from "@/features/post/featured-posts";
import { EmptyState, PostCard } from "@/features/post/post-card";
import { HeaderSearch } from "@/components/header-search";
import { SearchResults } from "@/features/search/search-results";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const post: Post = {
  id: "D_1",
  number: 1,
  slug: "first-post",
  title: "첫 번째 Next.js 게시글",
  body: "서버 컴포넌트 본문",
  excerpt: "첫 번째 게시글 요약",
  coverImage: "/og-default.png",
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
    expect(screen.getByText(post.excerpt)).toBeVisible();
  });

  it("FeaturedPosts 캐러셀 UI를 표시한다", () => {
    const second = { ...post, id: "D_2", number: 2, title: "두 번째 게시글" };
    render(<FeaturedPosts posts={[post, second]} />);
    expect(screen.getByText("Featured")).toBeVisible();
    expect(screen.getByText(post.title)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다음 featured 게시글" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "2번째 featured 게시글 보기" }),
    ).toBeVisible();
  });

  it("EmptyState 안내를 표시한다", () => {
    render(<EmptyState title="결과 없음" description="다시 검색하세요." />);
    expect(screen.getByRole("heading", { name: "결과 없음" })).toBeVisible();
  });
});

describe("검색과 테마 UI", () => {
  it("HeaderSearch가 검색 페이지로 제출한다", () => {
    render(<HeaderSearch />);
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/search");
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getByRole("searchbox")).toHaveAttribute("name", "q");
  });

  it("SearchResults가 검색어에 맞는 게시글을 표시한다", () => {
    render(<SearchResults posts={[post]} query="Next.js" />);
    expect(screen.getByText(post.title)).toBeVisible();
    expect(screen.getByText(/검색 결과 1개/)).toBeVisible();
  });

  it("ThemeToggle이 문서 테마를 변경한다", async () => {
    const { ThemeProvider } = await import(
      "@/components/layout/theme-provider"
    );
    const { SiteHeader } = await import("@/components/layout/site-header");
    render(
      <ThemeProvider>
        <SiteHeader />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "다크 모드로 전환" }));
    await screen.findByRole("button", { name: "라이트 모드로 전환" });
    expect(document.documentElement).toHaveClass("dark");
  });

  it("MusicToggle이 재생 상태를 전환한다", async () => {
    const { ThemeProvider } = await import(
      "@/components/layout/theme-provider"
    );
    const { SiteHeader } = await import("@/components/layout/site-header");
    render(
      <ThemeProvider>
        <SiteHeader />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "음악 켜기" }));
    await screen.findByRole("button", { name: "음악 끄기" });
    expect(window.localStorage.getItem("blog-music-enabled")).toBe("true");
  });
});
