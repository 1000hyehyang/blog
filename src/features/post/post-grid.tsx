import type { Post } from "@/domain/post";

import { PostCard } from "./post-card";
import { RevealGrid } from "./reveal-grid";

type PostGridProps = {
  posts: Post[];
  eagerImageSources?: string[];
};

export function PostGrid({ posts, eagerImageSources = [] }: PostGridProps) {
  return (
    <RevealGrid
      animationKey={posts.map((post) => post.id).join(":")}
      className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
    >
      {posts.map((post) => (
        <div key={post.id} data-post-card>
          <PostCard
            post={post}
            imageLoading={
              eagerImageSources.includes(post.coverImage.src)
                ? "eager"
                : undefined
            }
          />
        </div>
      ))}
    </RevealGrid>
  );
}
