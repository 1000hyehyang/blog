import type { Metadata } from "next";

import { SearchResults } from "@/features/search/search-results";
import { getPosts } from "@/infrastructure/github/github";

export const metadata: Metadata = {
  title: "검색",
  description: "블로그 포스트 검색",
  // 검색 결과 페이지는 쿼리별로 내용이 달라져 색인 대상에서 제외한다.
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ posts }, query] = await Promise.all([
    getPosts({ first: 50 }),
    searchParams,
  ]);
  return (
    <div className="page-shell">
      <SearchResults posts={posts} query={query.q} />
    </div>
  );
}
