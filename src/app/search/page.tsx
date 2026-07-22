import type { Metadata } from "next";

import { SearchResults } from "@/features/search/search-results";
import { getPosts } from "@/infrastructure/github/github";

export const metadata: Metadata = {
  title: "검색",
  description: "블로그 게시글 검색",
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
    <div className="container-shell py-16">
      <div className="mx-auto max-w-3xl">
        <SearchResults posts={posts} query={query.q} />
      </div>
    </div>
  );
}
