import type { NextConfig } from "next";

import { remoteImagePatterns } from "./src/config/images";

const nextConfig: NextConfig = {
  cacheComponents: true,
  distDir: process.env.BLOG_E2E === "1" ? ".next/e2e" : ".next",
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: { "/*": ["./content/posts/**/*.md"] },
  async headers() {
    return process.env.VERCEL_ENV === "preview"
      ? [
          {
            source: "/:path*",
            headers: [{ key: "X-Robots-Tag", value: "noindex" }],
          },
        ]
      : [];
  },
  images: {
    remotePatterns: remoteImagePatterns,
  },
  experimental: {
    staleTimes: {
      // 글 수정 후 이전 프리패치 결과가 오래 남지 않도록 제한한다.
      static: 30,
      dynamic: 0,
    },
  },
};

export default nextConfig;
