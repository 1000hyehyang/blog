"use client";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { PostGridSkeleton } from "@/features/post/post-grid-skeleton";

export default function CategoryLoading() {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryLoadingContent />
    </Suspense>
  );
}
function CategoryLoadingContent() {
  const art = usePathname() === "/category/art";
  return <CategorySkeleton art={art} />;
}
function CategorySkeleton({ art = false }: { art?: boolean }) {
  return (
    <div
      className="page-shell animate-pulse"
      aria-busy="true"
      aria-label="카테고리 불러오는 중"
    >
      <div className="h-10 w-40 rounded bg-muted" aria-hidden="true" />
      <div
        className="mb-12 mt-2 h-5 w-64 max-w-full rounded bg-muted"
        aria-hidden="true"
      />
      <PostGridSkeleton gallery={art} count={art ? 8 : 6} />
    </div>
  );
}
