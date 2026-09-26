export const routes = {
  home: "/",
  posts: "/posts",
  search: "/search",
  feed: "/feed.xml",
  post: (postId: string) => `/${encodeURIComponent(postId)}`,
  category: (slug: string) => `/category/${slug}`,
} as const;
