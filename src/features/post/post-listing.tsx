import Link from "next/link";
import type { PostSummary } from "@/domain/post";
import { ArtGallery } from "./art-gallery";
import { EmptyState } from "./empty-state";
import { PostGrid } from "./post-grid";

export function PostListing({
  posts,
  category,
  nextHref,
}: {
  posts: PostSummary[];
  category: string;
  nextHref?: string;
}) {
  const eagerImageSource = posts
    .map((post) =>
      category === "art"
        ? post.galleryImage?.src
          ? post.galleryImage
          : post.coverImage
        : post.coverImage,
    )
    .find((image) => image.src)?.src;
  return (
    <>
      {posts.length ? (
        category === "art" ? (
          <ArtGallery posts={posts} eagerImageSource={eagerImageSource} />
        ) : (
          <PostGrid posts={posts} eagerImageSource={eagerImageSource} />
        )
      ) : (
        <EmptyState />
      )}
      {nextHref && (
        <div className="mt-14 text-center">
          <Link
            href={nextHref}
            className="inline-flex rounded-full border px-6 py-3 text-xs"
          >
            다음 포스트
          </Link>
        </div>
      )}
    </>
  );
}
