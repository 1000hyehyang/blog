"use client";

import { useEffect, useState } from "react";

import type { PostHeading } from "@/lib/content";

const HEADER_OFFSET = 96;

type PostTableOfContentsProps = {
  headings: PostHeading[];
};

export function PostTableOfContents({ headings }: PostTableOfContentsProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (!headings.length) return;

    function updateActiveHeading() {
      let current = headings[0]?.id ?? "";

      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (element && element.getBoundingClientRect().top <= HEADER_OFFSET) {
          current = heading.id;
        }
      }

      setActiveId(current);
    }

    updateActiveHeading();
    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);

    return () => {
      window.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [headings]);

  if (!headings.length) return null;

  function scrollToHeading(id: string) {
    const element = document.getElementById(id);
    if (!element) return;

    const top =
      element.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;

    window.scrollTo({ top, behavior: "smooth" });
    setActiveId(id);
  }

  return (
    <aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
      <nav aria-label="목차" className="py-2">
        <ul className="space-y-1">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;

            return (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToHeading(heading.id);
                  }}
                  aria-current={isActive ? "location" : undefined}
                  className={`relative block py-1.5 text-xs leading-5 transition-colors outline-none focus:outline-none focus-visible:outline-none ${
                    heading.level === 3
                      ? "pl-7"
                      : heading.level === 2
                        ? "pl-4"
                        : "pl-2"
                  } ${
                    isActive
                      ? "font-medium text-foreground"
                      : "text-tertiary hover:text-secondary"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground"
                    />
                  )}
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
