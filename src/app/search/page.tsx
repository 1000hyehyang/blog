import type { Metadata } from "next";

import { SearchResults } from "@/features/search/search-results";
import { getAllPosts } from "@/infrastructure/github/posts";

export const metadata: Metadata = {
  title: "검색",
  description: "블로그 포스트 검색",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [posts, query] = await Promise.all([getAllPosts(), searchParams]);
  return (
    <div className="page-shell">
      <SearchResults posts={posts} query={query.q} />
    </div>
  );
}
