import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getPosts } from "@/infrastructure/github/github";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { posts } = await getPosts({ first: 50 });
  const staticRoutes = ["", "/posts", "/search", "/about"].map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
  }));
  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: `${siteConfig.url}/posts/${post.number}`,
      lastModified: new Date(post.updatedAt),
    })),
  ];
}
