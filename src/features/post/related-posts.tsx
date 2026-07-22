import Link from "next/link";

import { PostCoverImage } from "@/components/post-cover-image";
import type { Post } from "@/domain/post";
import { routes } from "@/lib/routes";

function RelatedPostCard({ post }: { post: Post }) {
  return (
    <article className="group">
      <Link
        href={routes.post(post.number)}
        className="block focus-visible:outline-offset-4"
      >
        <div className="relative aspect-video overflow-hidden bg-muted">
          <PostCoverImage
            src={post.coverImage}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        </div>
        <h3 className="mt-4 line-clamp-2 text-sm font-semibold leading-6 tracking-tight group-hover:underline group-hover:underline-offset-4">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-secondary">
          {post.excerpt}
        </p>
      </Link>
    </article>
  );
}

export function RelatedPosts({
  posts,
  embedded = false,
}: {
  posts: Post[];
  embedded?: boolean;
}) {
  if (!posts.length) return null;

  return (
    <section
      className={
        embedded
          ? "mt-16 border-t pt-12"
          : "mx-auto mt-16 max-w-[var(--container-width)] border-t pt-12"
      }
      aria-labelledby="related-posts-title"
    >
      <h2 id="related-posts-title" className="text-xs font-semibold uppercase tracking-widest text-tertiary">
        관련 게시물
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-3">
        {posts.map((post) => (
          <RelatedPostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
