export const routes = {
  home: "/",
  posts: "/posts",
  search: "/search",
  feed: "/feed.xml",
  post: (postId: string) => `/${encodeURIComponent(postId)}`,
  category: (slug: string) => `/category/${slug}`,
  series: (category: string, series: string) =>
    `/category/${category}/series/${series}`,
} as const;
