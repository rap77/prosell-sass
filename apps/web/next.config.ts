import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // React Compiler is the canonical optimization for React 19 in Next 16+
  // It memoizes components/hooks automatically, eliminating the need for manual
  // useMemo/useCallback in most cases. The Babel plugin is provided by Next 16
  // and runs in the SWC/Turbopack pipeline.
  reactCompiler: true,

  // Allow next/image to load images from external domains used in the catalog.
  // Unsplash is used for mock data; real vehicle images come from self-hosted storage.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "atl1.digitaloceanspaces.com",
      },
      // MinIO local dev: the API signs presigned URLs against the public
      // endpoint (http://localhost:9000), so the browser needs to be able to
      // fetch from there. The signed signature is host-bound.
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
    ],
  },

  // Bundle size optimization: Optimize imports from packages with barrel files
  // This prevents the bundler from loading the entire barrel file when importing specific exports
  // See: https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
  outputFileTracingRoot: path.join(__dirname, "../../"),

  experimental: {
    optimizePackageImports: [
      "lucide-react", // Icon library used in chadcn/ui components
      "@/components/icons", // Local icon components with barrel file
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    // Backend API URL - must be http://localhost:8000 for OAuth to work
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },

  // Proxy API requests to backend during development
  // Using 'fallback' type ensures rewrites are processed AFTER Next.js API routes
  // This allows /api/v1/vehicles/* to use Next.js API routes (for cookie forwarding)
  async rewrites() {
    // During SSR/build, we use API_URL (internal docker network)
    // During client-side navigation, we use NEXT_PUBLIC_API_URL
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    return {
      // Process rewrites AFTER Next.js API routes
      // This allows our custom API routes (like /api/v1/vehicles) to handle requests first
      fallback: [
        {
          source: "/api/:path*",
          destination: `${apiUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
