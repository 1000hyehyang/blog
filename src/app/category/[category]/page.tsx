import type { Metadata } from "next";

import { getCategoryLabel, getCategoryTagline } from "@/config/site";
import { EmptyState, PostGrid } from "@/features/post/post-card";
import { getPosts } from "@/infrastructure/github/github";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const label = getCategoryLabel(category);
  const tagline = getCategoryTagline(category);
  return {
    title: `${label} 카테고리`,
    description: tagline,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const { posts } = await getPosts({ first: 50, category });
  const label = getCategoryLabel(category);
  const tagline = getCategoryTagline(category);

  return (
    <div className="container-shell py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{label}</h1>
      <p className="mb-12 mt-2 text-sm text-secondary">{tagline}</p>
      {posts.length ? (
        <PostGrid posts={posts} />
      ) : (
        <EmptyState
          title="게시글이 없습니다"
          description="이 카테고리에는 아직 공개된 글이 없습니다."
        />
      )}
    </div>
  );
}
