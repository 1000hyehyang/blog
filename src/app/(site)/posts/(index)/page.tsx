import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { siteConfig } from "@/config/site";
import { EmptyState } from "@/features/post/empty-state";
import { PostGrid } from "@/features/post/post-grid";
import { getAllPosts, getPosts } from "@/infrastructure/github/posts";
import { routes } from "@/lib/routes";
import { missingPageMetadata } from "@/lib/seo";

type PostsPageProps = {
  searchParams: Promise<{ cursor?: string; sort?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PostsPageProps): Promise<Metadata> {
  const query = await searchParams;
  if (query.cursor) {
    const posts = await getAllPosts();
    if (query.sort === "oldest") posts.reverse();
    const index = posts.findIndex((post) => post.slug === query.cursor);
    if (index === -1 || index === posts.length - 1) return missingPageMetadata;
  }
  const params = new URLSearchParams();
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.sort === "oldest") params.set("sort", "oldest");
  const canonical = `${routes.posts}${params.size ? `?${params}` : ""}`;

  return {
    title: "All Posts",
    description: `${siteConfig.name}의 모든 포스트`,
    alternates: { canonical },
    ...(query.sort === "oldest" && {
      robots: { index: false, follow: true },
    }),
    openGraph: {
      type: "website",
      locale: "ko_KR",
      title: "All Posts",
      description: `${siteConfig.name}의 모든 포스트`,
      url: canonical,
      images: [siteConfig.defaultImage],
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title: "All Posts",
      description: `${siteConfig.name}의 모든 포스트`,
      images: [siteConfig.defaultImage],
    },
  };
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const query = await searchParams;
  const sort = query.sort === "oldest" ? "oldest" : "latest";
  const result = await getPosts({ first: 12, after: query.cursor, sort });
  const posts = result.posts;
  if (query.cursor && !posts.length) notFound();

  return (
    <div className="page-shell">
      <div className="mb-12 flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title">All Posts</h1>
          <p className="mt-2 text-sm text-secondary">
            {posts.length}개의 포스트
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
        <PostGrid
          posts={posts}
          eagerImageSource={
            posts.find((post) => post.coverImage.src)?.coverImage.src
          }
        />
      ) : (
        <EmptyState />
      )}
      {result.pageInfo.hasNextPage && result.pageInfo.endCursor && (
        <div className="mt-14 text-center">
          <Link
            href={`${routes.posts}?cursor=${encodeURIComponent(result.pageInfo.endCursor)}&sort=${sort}`}
            className="inline-flex rounded-full border px-6 py-3 text-xs"
          >
            다음 포스트
          </Link>
        </div>
      )}
    </div>
  );
}
