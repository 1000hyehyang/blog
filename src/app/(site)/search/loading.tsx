import { PostGridSkeleton } from "@/features/post/post-grid-skeleton";

export default function SearchLoading() {
  return (
    <div
      className="page-shell animate-pulse"
      aria-label="검색 결과 불러오는 중"
    >
      <div className="mb-6 h-4 w-36 rounded bg-muted" />
      <PostGridSkeleton />
    </div>
  );
}
