import type { NextConfig } from "next";

import { remoteImagePatterns } from "./src/config/images";

const nextConfig: NextConfig = {
  // Keep browser tests separate from an already running local editor.
  distDir: process.env.BLOG_E2E === "1" ? ".next/e2e" : ".next",
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: { "/*": ["./content/posts/**/*.md"] },
  images: {
    remotePatterns: remoteImagePatterns,
  },
  experimental: {
    staleTimes: {
      // 웹훅 무효화 이후에도 남을 수 있는 프리패치 RSC의 수명을 제한한다.
      static: 30,
    },
  },
};

export default nextConfig;
