"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { HeaderSearch } from "@/features/search/header-search";
import { MusicToggle } from "@/components/layout/music-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { siteConfig } from "@/config/site";
import { routes } from "@/lib/routes";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const drawerTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const };

  const overlayTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.2 };

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
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((value) => !value)}
            className="grid size-9 place-items-center rounded-full bg-muted md:hidden"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {menuOpen && (
              <>
                <motion.button
                  type="button"
                  key="mobile-menu-overlay"
                  aria-label="메뉴 닫기"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={overlayTransition}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-[60] bg-black/40 md:hidden"
                />
                <motion.nav
                  key="mobile-menu-drawer"
                  id="mobile-menu"
                  aria-label="모바일 메뉴"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={drawerTransition}
                  className="fixed inset-y-0 right-0 z-[70] flex w-[min(85vw,320px)] flex-col border-l border-border bg-surface p-6 shadow-[var(--shadow-md)] md:hidden"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-sm font-semibold tracking-tight">
                      {siteConfig.shortName}
                    </span>
                    <button
                      type="button"
                      aria-label="메뉴 닫기"
                      onClick={() => setMenuOpen(false)}
                      className="grid size-9 place-items-center rounded-full bg-muted"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <HeaderSearch variant="mobile" />
                  <ul className="mt-6 space-y-1">
                    {siteConfig.navigation.map((item) => {
                      const href = routes.category(item.category);
                      return (
                        <li key={item.category}>
                          <Link
                            href={href}
                            aria-current={pathname === href ? "page" : undefined}
                            onClick={() => setMenuOpen(false)}
                            className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-secondary transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </motion.nav>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </header>
  );
}
