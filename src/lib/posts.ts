import type { Post } from "@/domain/post";

export function sortFeaturedPosts(posts: Post[]) {
  return [...posts].sort((a, b) => {
    const orderDiff = (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999);
    if (orderDiff !== 0) return orderDiff;

    return (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() ||
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
  const others = posts.filter((item) => item.number !== current.number);
  const sameCategory = others.filter(
    (item) => item.category.slug === current.category.slug,
  );
  const differentCategory = others.filter(
    (item) => item.category.slug !== current.category.slug,
  );

  return [...sameCategory, ...differentCategory].slice(0, limit);
}
