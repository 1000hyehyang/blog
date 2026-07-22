import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    staleTimes: {
      // Link prefetch로 캐시된 상세 페이지 RSC가 오래 남지 않도록
      static: 0,
    },
  },
};

export default nextConfig;
