import type { Post, PostPreview } from "@/domain/post";

import { rankRelatedPosts } from "./related-post-ranking";

function sortFeaturedPosts(posts: Post[]) {
  return [...posts].sort((a, b) => {
    const orderDiff = (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999);
    if (orderDiff !== 0) return orderDiff;

    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
      a.number - b.number
    );
  });
}

export function getFeaturedPosts(posts: Post[]) {
  return sortFeaturedPosts(posts.filter((post) => post.featured));
}

export function toPostPreview(post: Post): PostPreview {
  return {
    id: post.id,
    number: post.number,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    category: post.category,
    createdAt: post.createdAt,
  };
}

export function getRecentPosts(
  posts: Post[],
  limit: number,
  excludedCategory = "art",
) {
  return posts
    .filter((post) => post.category.slug !== excludedCategory)
    .slice(0, limit);
}

export function getRecentArtPosts(posts: Post[], limit: number) {
  return posts.filter((post) => post.category.slug === "art").slice(0, limit);
}

export function getRelatedPosts(
  posts: Post[],
  current: Post,
  limit = 3,
): Post[] {
  return rankRelatedPosts(posts, current, { limit });
}
