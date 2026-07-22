import { Heart, MessageCircle } from "lucide-react";
import Link from "next/link";

import { PostCoverImage } from "@/components/post-cover-image";
import type { Post } from "@/domain/post";
import { formatDate } from "@/lib/content";

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="group">
      <Link
        href={`/posts/${post.number}`}
        className="block rounded-[var(--radius-md)] focus-visible:outline-offset-4"
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-md)] bg-muted">
          <PostCoverImage
            src={post.coverImage}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        </div>
        <div className="pt-4">
          <h3 className="line-clamp-2 text-base font-semibold leading-7 tracking-tight group-hover:underline group-hover:underline-offset-4">
            {post.title}
          </h3>
          <p className="line-clamp-2 mt-2 min-h-12 text-sm leading-6 text-secondary">
            {post.excerpt}
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs text-tertiary">
            <span className="flex items-center gap-1">
              <MessageCircle size={12} />
              {post.commentsCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart size={12} />
              {post.reactionsCount}
            </span>
            <time className="ml-auto" dateTime={post.updatedAt}>
              {formatDate(post.updatedAt)}
            </time>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function PostGrid({ posts }: { posts: Post[] }) {
  return (
    <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="py-10 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-secondary">{description}</p>
    </div>
  );
}
