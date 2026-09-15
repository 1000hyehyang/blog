"use client";
import { usePathname } from "next/navigation";
import { PostGridSkeleton } from "@/features/post/post-grid-skeleton";

export default function CategoryLoading() {
  const art = usePathname() === "/category/art";
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
      {art ? (
        <div
          className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4"
          aria-hidden="true"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="mb-3 aspect-[4/5] break-inside-avoid rounded-[var(--radius-md)] bg-muted sm:mb-4"
            />
          ))}
        </div>
      ) : (
        <PostGridSkeleton />
      )}
    </div>
  );
}
