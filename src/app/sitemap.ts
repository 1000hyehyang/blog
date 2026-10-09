import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { resolvePostModifiedAt } from "@/lib/content";
import { getAllPosts } from "@/infrastructure/github/posts";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  const staticRoutes = [routes.home, routes.posts].map((route) => ({
    url: absoluteUrl(route),
  }));

  const categoryRoutes = siteConfig.navigation
    .filter((item) =>
      posts.some((post) => post.category.slug === item.category),
    )
    .map((item) => ({ url: absoluteUrl(routes.category(item.category)) }));

  const postRoutes = posts.map((post) => ({
    url: absoluteUrl(routes.post(post.id)),
    lastModified: resolvePostModifiedAt(post),
  }));

  const seriesRoutes = siteConfig.navigation.flatMap((category) =>
    category.series
      .filter((series) =>
        posts.some(
          (post) =>
            post.category.slug === category.category &&
            post.series === series.slug,
        ),
      )
      .map((series) => ({
        url: absoluteUrl(routes.series(category.category, series.slug)),
      })),
  );

  return [...staticRoutes, ...categoryRoutes, ...seriesRoutes, ...postRoutes];
}
