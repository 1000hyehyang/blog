import { Heart, MessageCircle } from "lucide-react";
import Link from "next/link";

import type { Post } from "@/domain/post";
import { routes } from "@/lib/routes";

import { ArtworkFrame } from "./artwork-frame";
import { RevealGrid } from "./reveal-grid";

type ArtGalleryProps = {
  posts: Post[];
  eagerFirstImage?: boolean;
};

export function ArtGallery({
  posts,
  eagerFirstImage = false,
}: ArtGalleryProps) {
  return (
    <RevealGrid
      animationKey={posts.map((post) => post.id).join(":")}
      className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4"
    >
      {posts.map((post, index) => {
        const image = post.galleryImage ?? post.coverImage;

        return (
          <article
            key={post.id}
            data-post-card
            className="mb-3 break-inside-avoid sm:mb-4"
          >
            <Link
              href={routes.post(post.number)}
              aria-label={`${post.title} 작품 보기`}
              className="group relative block overflow-hidden rounded-[var(--radius-md)] bg-muted focus-visible:outline-offset-4"
            >
              <ArtworkFrame
                image={image}
                loading={eagerFirstImage && index === 0 ? "eager" : undefined}
                sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
              >
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/30 to-transparent px-3 pb-3 pt-12 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 sm:px-4 sm:pb-4">
                  <h3 className="line-clamp-2 text-xs font-semibold leading-5 sm:text-sm">
                    {post.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-[0.6875rem] text-white/75">
                    <span className="flex items-center gap-1">
                      <MessageCircle aria-hidden size={11} />
                      <span className="sr-only">댓글</span>
                      {post.commentsCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart aria-hidden size={11} />
                      <span className="sr-only">반응</span>
                      {post.reactionsCount}
                    </span>
                  </div>
                </div>
              </ArtworkFrame>
            </Link>
          </article>
        );
      })}
    </RevealGrid>
  );
}
