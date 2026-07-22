"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { Post } from "@/domain/post";

export function FeaturedPosts({ posts }: { posts: Post[] }) {
  const [index, setIndex] = useState(0);
  if (!posts.length) return null;
  const post = posts[index] ?? posts[0];

  function move(amount: number) {
    setIndex((current) => (current + amount + posts.length) % posts.length);
  }

  return (
    <section
      aria-labelledby="featured-title"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") move(-1);
        if (event.key === "ArrowRight") move(1);
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 id="featured-title" className="text-xs font-semibold">
          ✣ Pinned Posts
        </h2>
        {posts.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => move(-1)}
              aria-label="이전 고정 게시글"
              className="grid size-9 place-items-center rounded-full border"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              onClick={() => move(1)}
              aria-label="다음 고정 게시글"
              className="grid size-9 place-items-center rounded-full border"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="grid items-center gap-8 md:grid-cols-[1.35fr_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-muted">
          <Image
            key={post.id}
            src={post.coverImage}
            alt={`${post.title} 대표 이미지`}
            fill
            priority={index === 0}
            unoptimized
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-cover"
          />
          <span className="absolute bottom-3 left-3 rounded bg-black/75 px-2 py-1 text-[10px] text-white">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-tertiary">
            {post.category.name}
          </p>
          <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
            {post.title}
          </h3>
          <p className="mt-5 line-clamp-3 text-xs leading-6 text-secondary">
            {post.excerpt}
          </p>
          <Link
            href={`/posts/${post.number}`}
            className="mt-7 inline-flex rounded-[var(--radius-sm)] bg-accent px-5 py-2.5 text-xs text-background"
          >
            자세히 보기
          </Link>
        </div>
      </div>
      {posts.length > 1 && (
        <div
          className="mt-3 flex justify-center gap-1.5"
          aria-label={`${posts.length}개 중 ${index + 1}번째`}
        >
          {posts.map((item, itemIndex) => (
            <button
              key={item.id}
              onClick={() => setIndex(itemIndex)}
              aria-label={`${itemIndex + 1}번째 게시글 보기`}
              className={`h-1.5 rounded-full transition-all ${itemIndex === index ? "w-5 bg-foreground" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
