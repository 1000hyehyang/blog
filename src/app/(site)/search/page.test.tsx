import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { searchPosts } from "@/infrastructure/github/posts";
import SearchPage from "./page";

vi.mock("@/infrastructure/github/posts", () => ({ searchPosts: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each([
  {
    params: { q: " fixture ", cursor: "post-12" },
    q: " fixture ",
    after: "post-12",
  },
  {
    params: { q: ["fixture", "next"], cursor: ["post-1", "post-2"] },
    q: "",
    after: undefined,
  },
  {
    params: { q: "fixture", cursor: ["post-1", "post-2"] },
    q: "fixture",
    after: undefined,
  },
  { params: {}, q: "", after: undefined },
])(
  "normalizes search parameters $params at the page boundary",
  async ({ params, q, after }) => {
    vi.mocked(searchPosts).mockResolvedValue({
      posts: [],
      totalCount: 0,
      pageInfo: { hasNextPage: true, endCursor: "post-12" },
    });
    render(await SearchPage({ searchParams: Promise.resolve(params) }));

    expect(searchPosts).toHaveBeenCalledWith(q, { after });
    expect(
      screen.getByRole("heading", {
        name: q ? "검색 결과가 없습니다" : "검색어를 입력하세요",
      }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "다음 포스트" })).toHaveAttribute(
      "href",
      `/search?${new URLSearchParams({ q, cursor: "post-12" })}`,
    );
  },
);
