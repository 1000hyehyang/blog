"use client";

import { Search } from "lucide-react";

export function HeaderSearch({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const isMobile = variant === "mobile";

  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={
        isMobile
          ? "header-search relative w-full"
          : "header-search relative hidden sm:block"
      }
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
          name="q"
          role="searchbox"
          placeholder="게시글 검색"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          className="w-full border-0 bg-transparent caret-foreground shadow-none outline-none ring-0 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-tertiary"
        />
      </label>
    </form>
  );
}
