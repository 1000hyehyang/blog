import { PostGridSkeleton } from "@/features/post/post-grid-skeleton";

export default function PostsLoading() {
  return (
    <div
      className="page-shell animate-pulse"
      aria-busy="true"
      aria-label="글 목록 불러오는 중"
    >
      <div
        className="mb-12 flex items-end justify-between gap-4"
        aria-hidden="true"
      >
        <div>
          <div className="h-10 w-40 rounded bg-muted" />
          <div className="mt-2 h-5 w-44 rounded bg-muted" />
        </div>
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
      <PostGridSkeleton count={12} />
    </div>
  );
}
