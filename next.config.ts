import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Link bài cũ (/bai/ten-bai, /en/song/ten-bai) → link ngắn mới; 308 để Google cập nhật và link đã chia sẻ vẫn chạy
  async redirects() {
    return [
      { source: "/bai/:slug", destination: "/:slug", permanent: true },
      { source: "/en/song/:slug", destination: "/en/:slug", permanent: true },
      // Bỏ chia kho Solo / Melody — mọi bài nằm chung ở trang chủ
      { source: "/:collection(solo|melody)", destination: "/", permanent: true },
      { source: "/en/:collection(solo|melody)", destination: "/en", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
