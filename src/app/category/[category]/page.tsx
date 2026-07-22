import type { Metadata } from "next";

import { EmptyState, PostGrid } from "@/features/post/post-card";
import { getPosts } from "@/infrastructure/github/github";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return {
    title: `${category} 카테고리`,
    description: `${category} 카테고리의 게시글`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const { posts } = await getPosts({ first: 50, category });
  return (
    <div className="container-shell py-16">
      <h1 className="text-3xl font-semibold capitalize tracking-tight">
        {category}
      </h1>
      <p className="mb-12 mt-2 text-sm text-secondary">
        이 카테고리에 발행된 글입니다.
      </p>
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
