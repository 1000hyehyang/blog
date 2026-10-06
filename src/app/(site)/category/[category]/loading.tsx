"use client";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getCategoryNavigation } from "@/config/site";
import type { BlogCategory } from "@/config/categories";
import { PostGridSkeleton } from "@/features/post/post-grid-skeleton";

export default function CategoryLoading() {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryLoadingContent />
    </Suspense>
  );
}
function CategoryLoadingContent() {
  const category = usePathname().split("/")[2];
  return <CategorySkeleton navigation={getCategoryNavigation(category)} />;
}
function CategorySkeleton({ navigation }: { navigation?: BlogCategory }) {
  const art = navigation?.category === "art";
  return (
    <div
      className="page-shell"
      aria-busy="true"
      aria-label="카테고리 불러오는 중"
    >
      {navigation ? (
        <>
          <h1 className="page-title">{navigation.label}</h1>
          <p className="mb-12 mt-2 text-sm text-secondary">
            {navigation.tagline}
          </p>
        </>
      ) : (
        <div aria-hidden="true" className="motion-safe:animate-pulse">
          <div className="page-title h-[1lh] w-40 rounded bg-muted" />
          <div className="mb-12 mt-2 h-5 w-64 max-w-full rounded bg-muted" />
        </div>
      )}
      <div aria-hidden="true" inert>
        <Tabs defaultValue="all">
          <TabsList label="글 보기">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="series">시리즈</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <div className="motion-safe:animate-pulse">
              <PostGridSkeleton gallery={art} count={art ? 8 : 6} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
