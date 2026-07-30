import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지를 가볍게 만들기 위한 standalone 출력 (node_modules 전체를 복사하지 않아도 됨)
  output: "standalone",
};

export default nextConfig;
