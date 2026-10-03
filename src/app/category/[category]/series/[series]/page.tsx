import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryNavigation, siteConfig } from "@/config/site";
import { PostListing } from "@/features/post/post-listing";
import { getPosts } from "@/infrastructure/github/posts";
import { routes } from "@/lib/routes";

type Props = {
  params: Promise<{ category: string; series: string }>;
  searchParams: Promise<{ cursor?: string }>;
};
function resolveSeries(category: string, slug: string) {
  const navigation = getCategoryNavigation(category);
  const series = navigation?.series.find((item) => item.slug === slug);
  if (!navigation || !series) notFound();
  return { navigation, series };
}
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { category, series: slug } = await params;
  const { navigation, series } = resolveSeries(category, slug);
  const { cursor } = await searchParams;
  const canonical = `${routes.series(category, slug)}${cursor ? `?${new URLSearchParams({ cursor })}` : ""}`;
  const title = `${series.label} · ${navigation.label}`;
  const description =
    series.description ?? `${siteConfig.name}의 ${series.label} 시리즈`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [siteConfig.defaultImage],
    },
  };
}
export default async function SeriesPage({ params, searchParams }: Props) {
  const { category, series: slug } = await params;
  const { navigation, series } = resolveSeries(category, slug);
  const result = await getPosts({
    category,
    series: series.slug,
    after: (await searchParams).cursor,
  });
  return (
    <div className="page-shell">
      <nav aria-label="현재 위치" className="mb-6 text-sm text-secondary">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href={routes.category(category)}
              className="hover:text-foreground"
            >
              {navigation.label}
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <Link
              href={`${routes.category(category)}?tab=series`}
              className="hover:text-foreground"
            >
              시리즈
            </Link>
          </li>
          <li className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true">/</span>
            <span
              aria-current="page"
              className="wrap-break-word text-foreground"
            >
              {series.label}
            </span>
          </li>
        </ol>
      </nav>
      <h1 className="page-title">{series.label}</h1>
      {series.description && (
        <p className="mt-3 text-sm text-secondary">{series.description}</p>
      )}
      <p className="mb-10 mt-4 text-sm text-secondary">
        {result.totalCount}개의 포스트
      </p>
      <PostListing
        posts={result.posts}
        category={category}
        nextHref={
          result.pageInfo.endCursor
            ? `${routes.series(category, slug)}?${new URLSearchParams({ cursor: result.pageInfo.endCursor })}`
            : undefined
        }
      />
    </div>
  );
}
