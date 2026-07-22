"use client";

import { Menu, Moon, Search, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { siteConfig } from "@/config/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
      <div className="container-shell flex h-[var(--header-height)] items-center gap-6">
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold tracking-tight"
        >
          {siteConfig.shortName}
        </Link>
        <nav
          aria-label="주요 메뉴"
          className="hidden flex-1 justify-center gap-7 md:flex"
        >
          {siteConfig.navigation.map((item) => {
            const href = `/category/${item.category}`;
            return (
              <Link
                key={item.category}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className="text-xs text-secondary transition-colors hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search"
            aria-label="검색"
            className="hidden h-9 min-w-52 items-center gap-2 rounded-full bg-muted px-3 text-xs text-tertiary sm:flex"
          >
            <Search size={14} /> 게시글 검색
          </Link>
          <button
            type="button"
            aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
            onClick={toggleTheme}
            className="grid size-9 place-items-center rounded-full bg-muted"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            type="button"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="grid size-9 place-items-center rounded-full bg-muted md:hidden"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav
          aria-label="모바일 메뉴"
          className="container-shell flex gap-5 overflow-x-auto border-t py-4 md:hidden"
        >
          <Link href="/search" className="text-sm">
            검색
          </Link>
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.category}
              href={`/category/${item.category}`}
              className="whitespace-nowrap text-sm text-secondary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="container-shell mt-[var(--spacing-section)] border-t py-10 text-center text-xs text-tertiary">
      <p>Copyright ⓒ {siteConfig.author.name}</p>
    </footer>
  );
}
