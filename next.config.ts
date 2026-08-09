import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    staleTimes: {
      // 웹훅 무효화 이후에도 남을 수 있는 프리패치 RSC의 수명을 제한한다.
      static: 30,
    },
  },
};

export default nextConfig;
