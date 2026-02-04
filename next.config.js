// next.config.js
// Environment variables from src/env.js are loaded automatically by the app; no manual import here.

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io", // Allow serving images from utfs.io
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com", // Allow Vercel Blob public URLs
      },
      {
        protocol: "https",
        hostname: "public.blob.vercel-storage.com", // Fallback (no subdomain)
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = config;
