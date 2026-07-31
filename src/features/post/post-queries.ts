import type { Post } from "@/domain/post";

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

export function getRelatedPosts(
  posts: Post[],
  current: Post,
  limit = 3,
): Post[] {
  return rankRelatedPosts(posts, current, { limit });
}
