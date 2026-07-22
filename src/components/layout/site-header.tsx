"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { HeaderSearch } from "@/components/header-search";
import { MusicToggle } from "@/components/layout/music-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { siteConfig } from "@/config/site";
import { routes } from "@/lib/routes";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header-glass">
      <div className="container-shell flex h-[var(--header-height)] items-center gap-6">
        <Link
          href={routes.home}
          className="shrink-0 text-sm font-semibold tracking-tight"
        >
          {siteConfig.shortName}
        </Link>
        <nav
          aria-label="주요 메뉴"
          className="hidden flex-1 justify-center gap-7 md:flex"
        >
          {siteConfig.navigation.map((item) => {
            const href = routes.category(item.category);
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
          <HeaderSearch />
          <MusicToggle />
          <ThemeToggle />
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
          className="container-shell space-y-4 py-4 md:hidden"
        >
          <HeaderSearch variant="mobile" />
          <div className="flex gap-5 overflow-x-auto">
            {siteConfig.navigation.map((item) => (
              <Link
                key={item.category}
                href={routes.category(item.category)}
                className="whitespace-nowrap text-sm text-secondary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
