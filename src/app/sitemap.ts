import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { resolvePostModifiedAt } from "@/lib/content";
import { getAllPosts } from "@/infrastructure/github/github";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";

function toModifiedDate(post: {
  createdAt: string;
  lastEditedAt: string | null;
}) {
  const date = new Date(resolvePostModifiedAt(post));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getLatestModifiedDate(
  posts: Array<{ createdAt: string; lastEditedAt: string | null }>,
) {
  return posts.reduce<Date | undefined>((latest, post) => {
    const modified = toModifiedDate(post);
    if (!modified || (latest && modified <= latest)) return latest;
    return modified;
  }, undefined);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const latestPostModifiedAt = getLatestModifiedDate(posts);

  const staticRoutes = [routes.home, routes.posts].map((route) => ({
    url: absoluteUrl(route),
    ...(latestPostModifiedAt && { lastModified: latestPostModifiedAt }),
  }));

  const categoryRoutes = siteConfig.navigation.map((item) => {
    const latestCategoryPostModifiedAt = getLatestModifiedDate(
      posts.filter((post) => post.category.slug === item.category),
    );

    return {
      url: absoluteUrl(routes.category(item.category)),
      ...(latestCategoryPostModifiedAt && {
        lastModified: latestCategoryPostModifiedAt,
      }),
    };
  });

  const postRoutes = posts.map((post) => {
    const modifiedAt = toModifiedDate(post);

    return {
      url: absoluteUrl(routes.post(post.number)),
      ...(modifiedAt && { lastModified: modifiedAt }),
    };
  });

  return [...staticRoutes, ...categoryRoutes, ...postRoutes];
}
