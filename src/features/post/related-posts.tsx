import type { Post } from "@/domain/post";

import { PostCard } from "./post-card";

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
          ? "mt-12 border-t pt-8 sm:mt-16 sm:pt-12"
          : "mx-auto mt-12 max-w-[var(--container-width)] border-t pt-8 sm:mt-16 sm:pt-12"
      }
      aria-labelledby="related-posts-title"
    >
      <h2 id="related-posts-title" className="section-heading">
        관련 포스트
      </h2>
      <div
        data-reveal-cards
        className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 sm:gap-8 md:grid-cols-3 md:gap-10"
      >
        {posts.map((post) => (
          <div key={post.id} data-post-card>
            <PostCard post={post} variant="compact" />
          </div>
        ))}
      </div>
    </section>
  );
}
