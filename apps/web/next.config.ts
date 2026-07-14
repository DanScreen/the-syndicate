import type { NextConfig } from "next";

const corsOrigin =
  process.env.ALLOWED_ORIGIN ??
  (process.env.NODE_ENV === "production" ? "" : "*");

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@tiki-acca/shared", "@tiki-acca/database"],
  async headers() {
    if (!corsOrigin) return [];
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: corsOrigin },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
