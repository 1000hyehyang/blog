import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getCategoryNavigation, siteConfig } from "@/config/site";
import { PostListing } from "@/features/post/post-listing";
import { SeriesGrid } from "@/features/post/series-grid";
import { summarizeSeries } from "@/features/post/post-queries";
import { getAllPosts, getPosts } from "@/infrastructure/github/posts";
import { routes } from "@/lib/routes";
import { missingPageMetadata } from "@/lib/seo";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ cursor?: string; tab?: string }>;
};

export function generateStaticParams() {
  return siteConfig.navigation.map((item) => ({ category: item.category }));
}

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const navigation = getCategoryNavigation(category);
  if (!navigation) return missingPageMetadata;
  const { cursor } = await searchParams;
  const posts = await getAllPosts({ category });
  if (cursor) {
    const index = posts.findIndex((post) => post.slug === cursor);
    if (index === -1 || index === posts.length - 1) return missingPageMetadata;
  }
  const canonical = `${routes.category(category)}${cursor ? `?${new URLSearchParams({ cursor })}` : ""}`;

  const description = `${siteConfig.name}의 ${navigation.label} 글 모음. ${navigation.tagline}`;

  return {
    title: `${navigation.label} 카테고리`,
    description,
    alternates: { canonical },
    ...(!posts.length && { robots: { index: false, follow: true } }),
    openGraph: {
      type: "website",
      locale: "ko_KR",
      title: `${navigation.label} 카테고리`,
      description,
      url: canonical,
      images: [siteConfig.defaultImage],
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title: `${navigation.label} 카테고리`,
      description,
      images: [siteConfig.defaultImage],
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { category } = await params;
  const navigation = getCategoryNavigation(category);
  if (!navigation) notFound();

  const { cursor, tab } = await searchParams;
  const [result, seriesPosts] = await Promise.all([
    getPosts({ category, after: cursor }),
    navigation.series.length ? getAllPosts({ category }) : Promise.resolve([]),
  ]);
  const series = summarizeSeries(seriesPosts, navigation);
  if (cursor && !result.posts.length) notFound();

  return (
    <div className="page-shell">
      <h1 className="page-title">{navigation.label}</h1>
      <p className="mb-12 mt-2 text-sm text-secondary">{navigation.tagline}</p>
      <Tabs
        key={`${category}:${cursor ?? ""}:${tab ?? ""}`}
        defaultValue={tab === "series" ? "series" : "all"}
      >
        <TabsList label={`${navigation.label} 글 보기`}>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="series">시리즈</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <PostListing
            posts={result.posts}
            category={category}
            nextHref={
              result.pageInfo.endCursor
                ? `${routes.category(category)}?${new URLSearchParams({ cursor: result.pageInfo.endCursor })}`
                : undefined
            }
          />
        </TabsContent>
        <TabsContent value="series">
          <SeriesGrid category={category} series={series} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
