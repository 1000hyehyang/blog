"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { filterPosts } from "@/features/search/filter-posts";

type SearchIndexPost = {
  number: number;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  body: string;
};

export function HeaderSearch({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<SearchIndexPost[]>([]);

  useEffect(() => {
    fetch("/api/posts/search-index")
      .then((response) => response.json())
      .then((data: SearchIndexPost[]) => setPosts(data))
      .catch(() => setPosts([]));
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const results = useMemo(
    () => filterPosts(posts, query).slice(0, 8),
    [posts, query],
  );
  const showPanel = open && query.trim().length > 0;
  const isMobile = variant === "mobile";

  return (
    <div
      ref={rootRef}
      className={isMobile ? "relative w-full" : "relative hidden sm:block"}
    >
      <label
        className={
          isMobile
            ? "relative flex h-10 w-full items-center gap-2 rounded-full bg-muted px-3 text-sm"
            : "relative flex h-9 min-w-52 items-center gap-2 rounded-full bg-muted px-3 text-xs text-tertiary"
        }
      >
        <span className="sr-only">게시글 검색</span>
        <Search size={14} className="shrink-0 text-tertiary" />
        <input
          type="search"
          value={query}
          placeholder="게시글 검색"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          className="w-full bg-transparent outline-none placeholder:text-tertiary"
        />
      </label>

      {showPanel && (
        <div
          role="listbox"
          aria-label="검색 결과"
          className={
            isMobile
              ? "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-80 overflow-y-auto rounded-[var(--radius-md)] border bg-surface shadow-md"
              : "absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(24rem,calc(100vw-2rem))] max-h-96 overflow-y-auto rounded-[var(--radius-md)] border bg-surface shadow-md"
          }
        >
          {results.length ? (
            results.map((post) => (
              <Link
                key={post.number}
                href={`/posts/${post.number}`}
                role="option"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className="block border-b px-4 py-3 last:border-b-0 hover:bg-muted"
              >
                <p className="line-clamp-1 text-sm font-medium">{post.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-secondary">
                  {post.excerpt}
                </p>
                <p className="mt-2 text-[10px] text-tertiary">{post.category}</p>
              </Link>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-xs text-secondary">
              검색 결과가 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
