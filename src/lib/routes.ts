export const routes = {
  home: "/",
  posts: "/posts",
  search: "/search",
  feed: "/feed.xml",
  post: (number: number) => `/posts/${number}`,
  category: (slug: string) => `/category/${slug}`,
} as const;
