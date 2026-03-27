import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.cloudflare.steamstatic.com' },
      { protocol: 'https', hostname: 'media.steampowered.com' },
      { protocol: 'https', hostname: 'avatars.steamstatic.com' },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry SDK build logs
  silent: true,
  // Disable source map upload (no auth token configured)
  sourcemaps: {
    disable: true,
  },
});
