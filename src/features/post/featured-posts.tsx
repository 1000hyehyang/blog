"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { PostCoverImage } from "@/features/post/post-cover-image";
import type { Post } from "@/domain/post";
import { formatDate } from "@/lib/content";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type FeaturedPostsProps = {
  posts: Post[];
};

export function FeaturedPosts({ posts }: FeaturedPostsProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (!posts.length) return null;

  const hasMultiple = posts.length > 1;

  const navButtonClassName =
    "absolute top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-[0_1px_3px_rgb(0_0_0/0.04)] outline-none backdrop-blur-sm transition hover:bg-muted focus:outline-none focus-visible:outline-none";

  return (
    <section aria-labelledby="featured-title">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2
          id="featured-title"
          className="section-label"
        >
          Featured
        </h2>
        {hasMultiple && (
          <span className="text-[10px] tabular-nums text-tertiary">
            {String(current + 1).padStart(2, "0")} /{" "}
            {String(posts.length).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="relative">
        {hasMultiple && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 aspect-[16/10] md:inset-0 md:aspect-auto">
            <button
              type="button"
              aria-label="이전 featured 포스트"
              onClick={() => api?.scrollPrev()}
              className={cn(
                navButtonClassName,
                "pointer-events-auto left-3 md:left-0 md:-translate-x-1/2",
              )}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              aria-label="다음 featured 포스트"
              onClick={() => api?.scrollNext()}
              className={cn(
                navButtonClassName,
                "pointer-events-auto right-3 md:right-0 md:translate-x-1/2",
              )}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        <Carousel
          setApi={setApi}
          className="w-full"
          opts={{
            loop: hasMultiple,
            align: "start",
          }}
        >
        <CarouselContent className="-ml-0">
          {posts.map((post, index) => (
            <CarouselItem key={post.id} className="basis-full pl-0">
              <article className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr] md:gap-10">
                <Link
                  href={routes.post(post.number)}
                  className="group relative block aspect-[16/10] overflow-hidden rounded-[var(--radius-lg)] bg-muted"
                >
                  <PostCoverImage
                    src={post.coverImage}
                    alt=""
                    fill
                    priority={index === 0}
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </Link>

                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-tertiary">
                    {post.category.name}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                    <Link
                      href={routes.post(post.number)}
                      className="hover:underline hover:underline-offset-4"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-secondary">
                    {post.excerpt}
                  </p>
                  <div className="mt-5 flex items-center gap-3 text-[10px] text-tertiary">
                    <time dateTime={post.updatedAt}>
                      {formatDate(post.updatedAt)}
                    </time>
                  </div>
                  <Link
                    href={routes.post(post.number)}
                    className="mt-7 inline-flex rounded-[var(--radius-sm)] bg-foreground px-5 py-2.5 text-xs text-background transition-[filter] duration-200 hover:brightness-[1.06] dark:hover:brightness-[0.94]"
                  >
                    자세히 보기
                  </Link>
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      </div>

      {hasMultiple && (
        <div
          className="mt-5 flex justify-center gap-1.5"
          aria-label={`${posts.length}개 중 ${current + 1}번째`}
        >
          {posts.map((post, index) => (
            <button
              key={post.id}
              type="button"
              onClick={() => api?.scrollTo(index)}
                  aria-label={`${index + 1}번째 featured 포스트 보기`}
              aria-current={current === index ? "true" : undefined}
              className={cn(
                "h-1.5 rounded-full transition-all outline-none focus:outline-none focus-visible:outline-none",
                current === index
                  ? "w-5 bg-foreground"
                  : "w-1.5 bg-border hover:bg-tertiary",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
