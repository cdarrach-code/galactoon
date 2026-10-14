import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic image APIs read/write local style-reference assets; keep caching off.
  cacheComponents: false,
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
