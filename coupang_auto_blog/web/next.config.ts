import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Docker 배포용
  eslint: {
    // 프로덕션 빌드 시 ESLint 에러 무시
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 프로덕션 빌드 시 타입 체크 에러 무시
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // 쿠팡 CDN
      { protocol: "https", hostname: "**.coupangcdn.com" },
      { protocol: "https", hostname: "**.coupang.com" },
      // 모든 외부 이미지 허용 (MinIO, 스톡 이미지 등)
      { protocol: "http", hostname: "**" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
