import type { Metadata } from "next";
import Link from "next/link";

import { SearchResults } from "@/features/search/search-results";
import { searchPosts } from "@/infrastructure/github/posts";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "검색",
  description: "블로그 포스트 검색",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const query = await searchParams;
  const result = await searchPosts(query.q ?? "", { after: query.cursor });
  return (
    <div className="page-shell">
      <SearchResults
        posts={result.posts}
        query={query.q}
        totalCount={result.totalCount}
      />
      {result.pageInfo.endCursor && (
        <div className="mt-14 text-center">
          <Link
            href={`${routes.search}?${new URLSearchParams({ q: query.q ?? "", cursor: result.pageInfo.endCursor })}`}
            className="inline-flex rounded-full border px-6 py-3 text-xs"
          >
            다음 포스트
          </Link>
        </div>
      )}
    </div>
  );
}
