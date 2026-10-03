import type { PostSummary } from "@/domain/post";
import { EmptyState } from "@/features/post/empty-state";
import { PostGrid } from "@/features/post/post-grid";

export function SearchResults({
  posts,
  query = "",
  totalCount = posts.length,
}: {
  posts: PostSummary[];
  query?: string;
  totalCount?: number;
}) {
  const normalizedQuery = query.trim();

  return (
    <div aria-live="polite">
      {!normalizedQuery ? (
        <EmptyState
          title="검색어를 입력하세요"
          description="헤더 검색창에서 검색어를 입력하고 Enter를 눌러 주세요."
        />
      ) : posts.length ? (
        <>
          <p className="mb-6 text-xs text-secondary">
            &lsquo;{normalizedQuery}&rsquo; 검색 결과 {totalCount}개
          </p>
          <PostGrid
            posts={posts}
            eagerImageSource={
              posts.find((post) => post.coverImage.src)?.coverImage.src
            }
          />
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
