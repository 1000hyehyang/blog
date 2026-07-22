"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";

import { setupDetailPageReveal } from "@/lib/gsap/reveal";

type PostDetailRevealProps = {
  children: React.ReactNode;
};

export function PostDetailReveal({ children }: PostDetailRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      setupDetailPageReveal(root);
    }, root);

    return () => ctx.revert();
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
