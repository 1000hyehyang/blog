import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/link-preview-image"],
      disallow: ["/api/", "/write", "/manage", "/login"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
