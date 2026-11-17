"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
      return;
    }
    let id: string;
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    let stopped = false;
    const align = () => {
      if (stopped) return;
      const target = document.getElementById(id);
      if (!target) return;
      mutations.disconnect();
      target.scrollIntoView({ block: "start", behavior: "instant" });
    };
    const resize = new ResizeObserver(align);
    const mutations = new MutationObserver(align);
    const events = ["wheel", "pointerdown", "keydown", "hashchange"] as const;
    const stop = () => {
      stopped = true;
      resize.disconnect();
      mutations.disconnect();
      for (const event of events) window.removeEventListener(event, stop);
    };
    resize.observe(document.body);
    mutations.observe(document.body, { childList: true, subtree: true });
    for (const event of events)
      window.addEventListener(event, stop, { passive: true });
    align();
    return stop;
  }, [pathname]);

  return null;
}
