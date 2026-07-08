import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@the-syndicate/shared", "@the-syndicate/database"],
};

export default nextConfig;
