"use client";

import gsap from "gsap";
import { type ReactNode, useLayoutEffect, useRef } from "react";

import { setupCardGridReveal } from "@/lib/gsap/reveal";

type RevealGridProps = {
  children: ReactNode;
  className: string;
  animationKey: string;
};

export function RevealGrid({
  children,
  className,
  animationKey,
}: RevealGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const context = gsap.context(() => setupCardGridReveal(grid), grid);
    return () => context.revert();
  }, [animationKey]);

  return (
    <div ref={gridRef} className={className}>
      {children}
    </div>
  );
}
