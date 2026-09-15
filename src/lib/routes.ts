export const routes = {
  home: "/",
  posts: "/posts",
  search: "/search",
  feed: "/feed.xml",
  post: (slug: string) => `/posts/${encodeURIComponent(slug)}`,
  category: (slug: string) => `/category/${slug}`,
} as const;
