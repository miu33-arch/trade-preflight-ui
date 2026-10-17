import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  // Generates a self-contained bundle for minimal Docker image size
  output: "standalone",

  // Local asset & air-gapped protection
  poweredByHeader: false,
  reactStrictMode: true,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;