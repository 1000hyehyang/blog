import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCategoryNavigation, siteConfig } from "@/config/site";
import { ArtGallery } from "@/features/post/art-gallery";
import { EmptyState } from "@/features/post/empty-state";
import { PostGrid } from "@/features/post/post-grid";
import { getAllPosts } from "@/infrastructure/github/github";
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
      type: "website",
      title: `${navigation.label} 카테고리`,
      description: navigation.tagline,
      url: routes.category(category),
      images: [siteConfig.defaultImage],
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title: `${navigation.label} 카테고리`,
      description: navigation.tagline,
      images: [siteConfig.defaultImage],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const navigation = getCategoryNavigation(category);
  if (!navigation) notFound();

  const posts = await getAllPosts({ category });
  const eagerImageSource =
    category === "art"
      ? posts
          .map((post) => post.galleryImage ?? post.coverImage)
          .find((image) => image.src)?.src
      : posts.find((post) => post.coverImage.src)?.coverImage.src;

  return (
    <div className="page-shell">
      <h1 className="page-title">{navigation.label}</h1>
      <p className="mb-12 mt-2 text-sm text-secondary">{navigation.tagline}</p>
      {posts.length ? (
        category === "art" ? (
          <ArtGallery posts={posts} eagerImageSource={eagerImageSource} />
        ) : (
          <PostGrid posts={posts} eagerImageSource={eagerImageSource} />
        )
      ) : (
        <EmptyState
          title="포스트가 없습니다"
          description="이 카테고리에는 아직 공개된 포스트가 없습니다."
        />
      )}
    </div>
  );
}
