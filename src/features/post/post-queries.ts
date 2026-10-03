import type { PostSummary, PostPreview } from "@/domain/post";
import type { BlogCategory, BlogSeries } from "@/config/categories";
import { resolvePostModifiedAt } from "@/lib/content";

import { rankRelatedPosts } from "./related-post-ranking";

export type SeriesSummary = BlogSeries & {
  postCount: number;
  coverImage: PostSummary["coverImage"];
  updatedAt: string | null;
};

export function summarizeSeries(
  posts: PostSummary[],
  category: BlogCategory,
): SeriesSummary[] {
  const series = new Map<string, SeriesSummary>(
    category.series.map((item) => [
      item.slug,
      { ...item, postCount: 0, coverImage: { src: "" }, updatedAt: null },
    ]),
  );
  for (const post of posts) {
    if (
      !post.published ||
      post.category.slug !== category.category ||
      !post.series
    )
      continue;
    const summary = series.get(post.series);
    if (!summary) continue;
    summary.postCount++;
    if (!summary.coverImage.src && post.coverImage.src)
      summary.coverImage = post.coverImage;
    const updatedAt = resolvePostModifiedAt(post);
    if (
      !summary.updatedAt ||
      Date.parse(updatedAt) > Date.parse(summary.updatedAt)
    )
      summary.updatedAt = updatedAt;
  }
  return [...series.values()];
}

export function getFeaturedPosts(posts: PostSummary[]) {
  return posts
    .filter((post) => post.featured)
    .sort((a, b) => {
      const orderDiff = (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999);
      if (orderDiff !== 0) return orderDiff;

      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        a.slug.localeCompare(b.slug, "en", { numeric: true })
      );
    });
}

export function toPostPreview(post: PostSummary): PostPreview {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    category: post.category,
    createdAt: post.createdAt,
  };
}

export function getRecentPosts(
  posts: PostSummary[],
  limit: number,
  excludedCategory = "art",
) {
  return posts
    .filter((post) => post.category.slug !== excludedCategory)
    .slice(0, limit);
}

export function getRecentArtPosts(posts: PostSummary[], limit: number) {
  return posts.filter((post) => post.category.slug === "art").slice(0, limit);
}

export function getRelatedPosts(
  posts: PostSummary[],
  current: PostSummary,
  limit = 3,
): PostSummary[] {
  return rankRelatedPosts(posts, current, { limit });
}
