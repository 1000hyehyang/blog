import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getPosts } from "@/infrastructure/github/github";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { posts } = await getPosts({ first: 50 });

  const staticRoutes = [routes.home, routes.posts].map(
    (route) => ({
      url: absoluteUrl(route),
      lastModified: new Date(),
    }),
  );

  const categoryRoutes = siteConfig.navigation.map((item) => ({
    url: absoluteUrl(routes.category(item.category)),
    lastModified: new Date(),
  }));

  const postRoutes = posts.map((post) => ({
    url: absoluteUrl(routes.post(post.number)),
    lastModified: new Date(post.updatedAt),
  }));

  return [...staticRoutes, ...categoryRoutes, ...postRoutes];
}
