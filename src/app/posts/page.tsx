import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { EmptyState } from "@/features/post/empty-state";
import { PostGrid } from "@/features/post/post-grid";
import { getPosts } from "@/infrastructure/github/github";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "모든 포스트",
  description: `${siteConfig.name}의 모든 개발 기록`,
  alternates: { canonical: routes.posts },
};

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; sort?: string }>;
}) {
  const query = await searchParams;
  const result = await getPosts({ first: 12, after: query.cursor });
  const posts =
    query.sort === "oldest"
      ? [...result.posts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      : result.posts;

  return (
    <div className="page-shell">
      <div className="mb-12 flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title">모든 포스트</h1>
          <p className="mt-2 text-sm text-secondary">
            배움과 시행착오를 기록한 포스트입니다.
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <Link
            href={`${routes.posts}?sort=latest`}
            className={
              query.sort !== "oldest" ? "font-semibold" : "text-secondary"
            }
          >
            최신순
          </Link>
          <Link
            href={`${routes.posts}?sort=oldest`}
            className={
              query.sort === "oldest" ? "font-semibold" : "text-secondary"
            }
          >
            오래된순
          </Link>
        </div>
      </div>
      {posts.length ? (
        <PostGrid posts={posts} />
      ) : (
        <EmptyState
          title="포스트가 없습니다"
          description="표시할 포스트를 찾지 못했습니다."
        />
      )}
      {result.pageInfo.hasNextPage && result.pageInfo.endCursor && (
        <div className="mt-14 text-center">
          <Link
            href={`${routes.posts}?cursor=${encodeURIComponent(result.pageInfo.endCursor)}`}
            className="inline-flex rounded-full border px-6 py-3 text-xs"
          >
            다음 포스트
          </Link>
        </div>
      )}
    </div>
  );
}
