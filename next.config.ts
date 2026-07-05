import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow serving uploaded files from public/uploads
  images: {
    remotePatterns: [],
  },
  // Needed for pdf-parse and other Node.js modules in API routes
  serverExternalPackages: ["pdf-parse"],
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable Next.js dev indicator overlay
  devIndicators: false,
};

export default nextConfig;
