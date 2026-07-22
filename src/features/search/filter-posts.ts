type SearchablePost = {
  title: string;
  excerpt: string;
  body?: string;
  tags: string[];
  category: string | { name: string };
};

function getSearchHaystack(post: SearchablePost) {
  const categoryName =
    typeof post.category === "string" ? post.category : post.category.name;

  return [post.title, post.excerpt, post.body ?? "", categoryName, ...post.tags]
    .join(" ")
    .toLocaleLowerCase();
}

export function filterPosts<T extends SearchablePost>(
  posts: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];

  return posts.filter((post) => getSearchHaystack(post).includes(normalized));
}
