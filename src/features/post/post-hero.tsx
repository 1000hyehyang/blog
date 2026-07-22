import { PostCoverImage } from "@/features/post/post-cover-image";
import type { Post } from "@/domain/post";
import { formatDate } from "@/lib/content";

type PostHeroProps = {
  post: Post;
};

export function PostHero({ post }: PostHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-[var(--radius-lg)] bg-muted">
      <div className="relative aspect-[16/10] min-h-[260px]">
        <PostCoverImage
          src={post.coverImage}
          alt=""
          fill
          priority
          unoptimized
          sizes="(max-width: 1024px) 100vw, 760px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
            <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
            {post.updatedAt !== post.createdAt && (
              <>
                <span aria-hidden>·</span>
                <span>수정 {formatDate(post.updatedAt)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
