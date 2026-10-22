import type { NextConfig } from "next";

// Webflow Cloud adds the base path (your mount path, e.g. /app), the asset
// prefix and the Cloudflare adapter at build time, so only app-specific
// options belong here.
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Project text and settings are sent through server actions; uploads
      // go straight from the browser to Supabase Storage, so this stays small.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
