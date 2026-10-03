"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getCategoryNavigation } from "@/config/site";
import { PostGridSkeleton } from "@/features/post/post-grid-skeleton";

export default function SeriesLoading() {
  return (
    <Suspense fallback={<SeriesSkeleton />}>
      <SeriesLoadingContent />
    </Suspense>
  );
}
function SeriesLoadingContent() {
  const { category, series: slug } = useParams<{
    category: string;
    series: string;
  }>();
  const series = getCategoryNavigation(category)?.series.find(
    (item) => item.slug === slug,
  );
  return (
    <SeriesSkeleton
      gallery={category === "art"}
      description={Boolean(series?.description)}
    />
  );
}
function SeriesSkeleton({
  gallery = false,
  description = false,
}: {
  gallery?: boolean;
  description?: boolean;
}) {
  return (
    <div
      className="page-shell animate-pulse motion-reduce:animate-none"
      aria-busy="true"
      aria-label="시리즈 불러오는 중"
    >
      <div className="mb-6 flex items-center gap-2" aria-hidden="true">
        <div className="h-5 w-12 rounded bg-muted" />
        <span className="text-sm text-secondary">/</span>
        <div className="h-5 w-10 rounded bg-muted" />
        <span className="text-sm text-secondary">/</span>
        <div className="h-5 w-20 rounded bg-muted" />
      </div>
      <div
        className="h-9 w-48 max-w-full rounded bg-muted sm:h-[2.7rem]"
        aria-hidden="true"
      />
      {description && (
        <div
          className="mt-3 h-5 w-64 max-w-full rounded bg-muted"
          aria-hidden="true"
        />
      )}
      <div
        className="mb-10 mt-4 h-5 w-16 rounded bg-muted"
        aria-hidden="true"
      />
      <PostGridSkeleton gallery={gallery} />
    </div>
  );
}
