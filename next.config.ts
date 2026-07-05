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
  // Force Vercel to bundle the PDF.js worker file in serverless packages
  outputFileTracingIncludes: {
    "/api/upload": ["node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/api/vendors/[id]/process": ["node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
