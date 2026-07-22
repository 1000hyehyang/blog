"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";

import type { Post } from "@/domain/post";
import { setupCardGridReveal } from "@/lib/gsap/reveal";

import { PostCard } from "./post-card";

type PostGridProps = {
  posts: Post[];
};

export function PostGrid({ posts }: PostGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const ctx = gsap.context(() => {
      setupCardGridReveal(grid);
    }, grid);

    return () => ctx.revert();
  }, [posts]);

  return (
    <div
      ref={gridRef}
      className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
    >
      {posts.map((post) => (
        <div key={post.id} data-post-card>
          <PostCard post={post} />
        </div>
      ))}
    </div>
  );
}
