import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { Post } from "@/domain/post";
import { formatDate } from "@/lib/content";

export function CategoryBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex rounded-full border bg-surface px-2 py-1 text-[10px] font-medium text-secondary">
      {name}
    </span>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="group">
      <Link
        href={`/posts/${post.number}`}
        className="block rounded-[var(--radius-md)] focus-visible:outline-offset-4"
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-md)] bg-muted">
          <Image
            src={post.coverImage}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute left-3 top-3">
            <CategoryBadge name={post.category.name} />
          </div>
        </div>
        <div className="pt-4">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-6 tracking-tight group-hover:underline group-hover:underline-offset-4">
            {post.title}
          </h3>
          <p className="line-clamp-2 mt-2 min-h-10 text-xs leading-5 text-secondary">
            {post.excerpt}
          </p>
          <div className="mt-4 flex items-center gap-3 text-[10px] text-tertiary">
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
    <div className="rounded-[var(--radius-lg)] border bg-muted px-6 py-14 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-secondary">{description}</p>
    </div>
  );
}
