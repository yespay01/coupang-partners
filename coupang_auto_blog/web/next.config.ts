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
};

export default nextConfig;
