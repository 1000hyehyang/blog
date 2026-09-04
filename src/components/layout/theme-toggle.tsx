"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

import { AnimatedThemeIcon } from "@/components/layout/animated-theme-icon";
import { useHydrated } from "@/lib/react/use-hydrated";
import { usePrefersReducedMotion } from "@/lib/react/use-prefers-reduced-motion";

const TRANSITION_CLASS_NAME = "theme-circle-transition";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<void>;
  };
};

function useThemeCircleTransition() {
  const { resolvedTheme, setTheme } = useTheme();
  const shouldReduceMotion = usePrefersReducedMotion();
  const transitionInProgressRef = useRef(false);
  const isMounted = useHydrated();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove(TRANSITION_CLASS_NAME);
    };
  }, []);

  const isDark = resolvedTheme === "dark";

  const toggleTheme = useCallback(() => {
    if (transitionInProgressRef.current) {
      return;
    }

    const nextTheme = isDark ? "light" : "dark";
    const viewTransitionDocument = document as ViewTransitionDocument;

    if (shouldReduceMotion || !viewTransitionDocument.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    transitionInProgressRef.current = true;
    setIsTransitioning(true);
    document.documentElement.classList.add(TRANSITION_CLASS_NAME);

    const finishTransition = () => {
      transitionInProgressRef.current = false;
      setIsTransitioning(false);
      document.documentElement.classList.remove(TRANSITION_CLASS_NAME);
    };

    try {
      const transition = viewTransitionDocument.startViewTransition(() => {
        setTheme(nextTheme);
      });

      void transition.finished.catch(() => undefined).finally(finishTransition);
    } catch {
      finishTransition();
      setTheme(nextTheme);
    }
  }, [isDark, setTheme, shouldReduceMotion]);

  return {
    isDark,
    isMounted,
    isTransitioning,
    shouldReduceMotion,
    toggleTheme,
  };
}

export function ThemeToggle() {
  const {
    isDark,
    isMounted,
    isTransitioning,
    shouldReduceMotion,
    toggleTheme,
  } = useThemeCircleTransition();

  if (!isMounted) {
    return <span aria-hidden="true" className="inline-block size-9" />;
  }

  return (
    <button
      type="button"
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      aria-pressed={isDark}
      className="grid size-9 cursor-pointer place-items-center rounded-full bg-muted text-foreground transition-colors hover:text-secondary disabled:cursor-wait disabled:opacity-60"
      onClick={toggleTheme}
      disabled={isTransitioning}
    >
      <AnimatedThemeIcon showMoon={!isDark} reduceMotion={shouldReduceMotion} />
    </button>
  );
}
