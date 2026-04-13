import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from common Web3 CDN origins
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.ipfs.io" },
      { protocol: "https", hostname: "assets.coingecko.com" },
    ],
  },

  // Expose runtime base URL to all API routes
  env: {
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  },

  // Suppress noisy hydration warnings from React Flow in dev
  reactStrictMode: false,
};

export default nextConfig;
