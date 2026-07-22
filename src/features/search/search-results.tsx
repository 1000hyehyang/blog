"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { Post } from "@/domain/post";
import { EmptyState, PostGrid } from "@/features/post/post-card";

export function SearchResults({
  posts,
  initialQuery = "",
}: {
  posts: Post[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    return posts.filter((post) =>
      [post.title, post.excerpt, post.body, post.category.name, ...post.tags]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized),
    );
  }, [posts, query]);

  return (
    <>
      <label className="relative block">
        <span className="sr-only">게시글 검색어</span>
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="제목, 본문, 태그를 검색하세요"
          className="h-14 w-full rounded-full border bg-surface pl-12 pr-5 text-sm outline-none placeholder:text-tertiary"
          autoFocus
        />
      </label>
      <div className="mt-12" aria-live="polite">
        {!query.trim() ? (
          <EmptyState
            title="검색어를 입력하세요"
            description="제목, 요약, 카테고리, 본문을 검색합니다."
          />
        ) : results.length ? (
          <>
            <p className="mb-6 text-xs text-secondary">
              {results.length}개의 결과
            </p>
            <PostGrid posts={results} />
          </>
        ) : (
          <EmptyState
            title="검색 결과가 없습니다"
            description="다른 검색어를 입력해 보세요."
          />
        )}
      </div>
    </>
  );
}
