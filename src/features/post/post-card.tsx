import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import type { PostSummary } from "@/domain/post";
import { formatDate, resolvePostPublishedAt } from "@/lib/content";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { PostCoverImage } from "./post-cover-image";

type PostCardProps = {
  post: PostSummary;
  variant?: "default" | "compact";
  imageLoading?: "eager" | "lazy";
};

export function PostCard({
  post,
  variant = "default",
  imageLoading,
}: PostCardProps) {
  const isCompact = variant === "compact";

  return (
    <article className="group">
      <Link
        href={routes.post(post.id)}
        className="block rounded-[var(--radius-md)] focus-visible:outline-offset-4"
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-md)] bg-muted">
          <PostCoverImage
            image={post.coverImage}
            alt=""
            fill
            loading={imageLoading}
            sizes={
              isCompact
                ? "(max-width: 768px) 100vw, 33vw"
                : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        </div>
        <div className={cn(!isCompact && "pt-4")}>
          <h3
            className={cn(
              "line-clamp-2 wrap-break-word font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4",
              isCompact ? "mt-4 text-sm leading-6" : "text-base leading-7",
            )}
          >
            {post.title}
          </h3>
          <p
            className={cn(
              "text-secondary",
              isCompact
                ? "mt-2 line-clamp-3 text-xs leading-5"
                : "mt-2 line-clamp-2 min-h-12 text-sm leading-6",
            )}
          >
            {post.excerpt}
          </p>
          {!isCompact && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-tertiary">
              <span className="flex items-center gap-1">
                <MessageCircle size={12} />
                {post.commentsCount}
              </span>
              <span className="flex items-center gap-1">
                <Heart size={12} />
                {post.reactionsCount}
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-2">
                <Image
                  src="/blog-profile.jpg"
                  alt="블로그 프로필"
                  width={20}
                  height={20}
                  className="size-5 shrink-0 rounded-full object-cover"
                />
                <span className="text-secondary">
                  {siteConfig.author.nickname}
                </span>
                <time dateTime={resolvePostPublishedAt(post)}>
                  {formatDate(resolvePostPublishedAt(post))}
                </time>
              </span>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
