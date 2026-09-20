import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const scriptSources = process.env.NODE_ENV === "development"
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com"
  : "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com";
const productionSecurity = process.env.NODE_ENV === "production" ? "; upgrade-insecure-requests" : "";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
  async redirects() {
    return [{ source: "/blog", destination: "/episodes", permanent: true }, { source: "/blog/:path*", destination: "/episodes/:path*", permanent: true }];
  },
  async headers() {
    return [{
      source: "/((?!api/files(?:/|$)).*)",
      headers: [
        { key: "Content-Security-Policy", value: `default-src 'self'; ${scriptSources}; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com; frame-src 'self' https://www.youtube-nocookie.com https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com https://api.resend.com https://cloudflareinsights.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'${productionSecurity}` },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }] : []),
      ],
    }, {
      source: "/api/files/:path*",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
      ],
    }];
  },
};

export default nextConfig;
