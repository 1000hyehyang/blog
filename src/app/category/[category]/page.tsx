import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCategoryNavigation, siteConfig } from "@/config/site";
import { EmptyState, PostGrid } from "@/features/post/post-card";
import { getPosts } from "@/infrastructure/github/github";
import { routes } from "@/lib/routes";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return siteConfig.navigation.map((item) => ({ category: item.category }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const navigation = getCategoryNavigation(category);
  if (!navigation) return {};

  return {
    title: `${navigation.label} 카테고리`,
    description: navigation.tagline,
    alternates: { canonical: routes.category(category) },
    openGraph: {
      title: `${navigation.label} 카테고리`,
      description: navigation.tagline,
      url: routes.category(category),
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const navigation = getCategoryNavigation(category);
  if (!navigation) notFound();

  const { posts } = await getPosts({ first: 50, category });

  return (
    <div className="container-shell py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        {navigation.label}
      </h1>
      <p className="mb-12 mt-2 text-sm text-secondary">{navigation.tagline}</p>
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
