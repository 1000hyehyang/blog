import type { Post } from "@/domain/post";
import { EmptyState } from "@/features/post/empty-state";
import { PostGrid } from "@/features/post/post-grid";
import { filterPosts } from "@/features/search/filter-posts";

export function SearchResults({
  posts,
  query = "",
}: {
  posts: Post[];
  query?: string;
}) {
  const normalizedQuery = query.trim();
  const results = filterPosts(posts, normalizedQuery);

  return (
    <div aria-live="polite">
      {!normalizedQuery ? (
        <EmptyState
          title="검색어를 입력하세요"
          description="헤더 검색창에서 검색어를 입력하고 Enter를 눌러 주세요."
        />
      ) : results.length ? (
        <>
          <p className="mb-6 text-xs text-secondary">
            &lsquo;{normalizedQuery}&rsquo; 검색 결과 {results.length}개
          </p>
          <PostGrid posts={results} />
        </>
      ) : (
        <EmptyState
          title="검색 결과가 없습니다"
          description="다른 검색어로 다시 검색해 보세요."
        />
      )}
    </div>
  );
}
