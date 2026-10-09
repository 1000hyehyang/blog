"use client";

import { useEffect, useRef, useState } from "react";

import type { PostHeading } from "@/lib/content";
import { usePrefersReducedMotion } from "@/lib/react/use-prefers-reduced-motion";

const HEADER_OFFSET = 96;
// 스크롤 좌표의 반올림 오차를 1px 보정한다.
const ACTIVE_HEADING_OFFSET = HEADER_OFFSET + 1;
const SCROLL_EASING_MS = 160;

type PostTableOfContentsProps = {
  headings: PostHeading[];
};

function getHeadingScrollTop(element: HTMLElement) {
  const top =
    element.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  return Math.max(0, Math.min(top, maxScroll));
}

export function PostTableOfContents({ headings }: PostTableOfContentsProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");
  const scrollTarget = useRef<HTMLElement | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  function cancelScrollTarget() {
    scrollTarget.current = null;
    if (scrollFrame.current !== null) {
      window.cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    }
  }

  useEffect(() => {
    if (!headings.length) return;
    let animationFrame: number | null = null;

    function updateActiveHeading() {
      let current = headings[0]?.id ?? "";

      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (
          element &&
          element.getBoundingClientRect().top <= ACTIVE_HEADING_OFFSET
        ) {
          current = heading.id;
        }
      }

      setActiveId(current);
    }

    function scheduleActiveHeadingUpdate() {
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateActiveHeading();
      });
    }

    function alignScrollTarget() {
      const target = scrollTarget.current;
      if (target && reducedMotion)
        window.scrollTo({
          top: getHeadingScrollTop(target),
          behavior: "instant",
        });
    }

    const resizeObserver = new ResizeObserver(alignScrollTarget);
    if (reducedMotion) resizeObserver.observe(document.body);
    const cancelEvents = ["wheel", "pointerdown", "keydown"] as const;
    for (const event of cancelEvents)
      window.addEventListener(event, cancelScrollTarget, { passive: true });

    updateActiveHeading();
    window.addEventListener("scroll", scheduleActiveHeadingUpdate, {
      passive: true,
    });
    window.addEventListener("resize", scheduleActiveHeadingUpdate);

    return () => {
      cancelScrollTarget();
      resizeObserver.disconnect();
      for (const event of cancelEvents)
        window.removeEventListener(event, cancelScrollTarget);
      window.removeEventListener("scroll", scheduleActiveHeadingUpdate);
      window.removeEventListener("resize", scheduleActiveHeadingUpdate);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [headings, reducedMotion]);

  if (!headings.length) return null;

  function scrollToHeading(id: string) {
    const element = document.getElementById(id);
    if (!element) return;
    cancelScrollTarget();
    scrollTarget.current = element;
    setActiveId(id);

    if (reducedMotion) {
      window.scrollTo({
        top: getHeadingScrollTop(element),
        behavior: "instant",
      });
      return;
    }

    let position = window.scrollY;
    let easedTarget = position;
    let previousTime: number | null = null;
    let previousTop = getHeadingScrollTop(element);
    const advanceScroll = (time: number) => {
      const top = getHeadingScrollTop(element);
      const remaining = top - position;
      const blend =
        1 - Math.exp(-(time - (previousTime ?? time)) / SCROLL_EASING_MS);
      // 목표와 위치를 차례로 보간해 움직이는 제목을 따라가면서 출발과 도착 모두 완만하게 만든다.
      easedTarget += (top - easedTarget) * blend;
      position += (easedTarget - position) * blend;
      previousTime = time;
      const finished =
        Math.abs(remaining) <= 1 &&
        Math.abs(top - easedTarget) <= 1 &&
        top === previousTop;
      previousTop = top;
      window.scrollTo({ top: finished ? top : position, behavior: "instant" });
      if (finished) cancelScrollTarget();
      else scrollFrame.current = window.requestAnimationFrame(advanceScroll);
    };
    scrollFrame.current = window.requestAnimationFrame(advanceScroll);
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
                  className={`relative block py-1.5 text-xs leading-5 transition-colors ${
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
