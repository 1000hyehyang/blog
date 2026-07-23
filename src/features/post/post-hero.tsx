import { PostCoverImage } from "@/features/post/post-cover-image";
import type { Post } from "@/domain/post";
import { formatDate } from "@/lib/content";

type PostHeroProps = {
  post: Post;
};

/**
 * 커버 이미지 위에 제목을 얹는 히어로. 제목이 길면 세로로 늘어난다.
 *
 * aspect-ratio와 min-height가 같은 요소에 있으면 min-height가 비율을 타고
 * min-width로 전이되어 좁은 화면에서 뷰포트를 넘치므로, 비율(sizer)·최소
 * 높이(헤더)·이미지 레이어를 분리해 둔다.
 */
export function PostHero({ post }: PostHeroProps) {
  return (
    <header className="grid min-h-[260px] grid-cols-1 overflow-hidden rounded-[var(--radius-lg)] bg-muted">
      <div aria-hidden className="col-start-1 row-start-1 aspect-[16/10]" />

      <div aria-hidden className="relative col-start-1 row-start-1">
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
      </div>

      <div className="relative col-start-1 row-start-1 flex min-w-0 flex-col justify-end p-6 pt-24 sm:p-8 sm:pt-28">
        <h1 className="wrap-break-word text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl">
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
    </header>
  );
}
