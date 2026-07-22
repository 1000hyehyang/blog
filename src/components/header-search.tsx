"use client";

import { Search, X } from "lucide-react";
import { useRef, useState } from "react";

export function HeaderSearch({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const isMobile = variant === "mobile";
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const hasValue = value.length > 0;

  function clearSearch() {
    setValue("");
    inputRef.current?.focus();
  }

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
            : "header-search-field relative flex h-9 items-center gap-2 rounded-full bg-muted px-3 text-xs text-tertiary"
        }
      >
        <span className="sr-only">게시글 검색</span>
        <Search size={14} className="shrink-0 text-tertiary" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          role="searchbox"
          placeholder="게시글 검색"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent caret-foreground shadow-none outline-none ring-0 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-tertiary"
        />
        <button
          type="button"
          aria-label="검색어 지우기"
          aria-hidden={!hasValue}
          tabIndex={hasValue ? 0 : -1}
          data-visible={hasValue}
          onClick={clearSearch}
          className="header-search-clear grid size-5 shrink-0 place-items-center rounded-full text-tertiary hover:text-foreground"
        >
          <X size={14} />
        </button>
      </label>
    </form>
  );
}
