import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TODO: Re-enable reactCompiler after installing babel-plugin-react-compiler
  // reactCompiler: true,

  // Bundle size optimization: Optimize imports from packages with barrel files
  // This prevents the bundler from loading the entire barrel file when importing specific exports
  // See: https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
  experimental: {
    optimizePackageImports: [
      "lucide-react", // Icon library used in chadcn/ui components
      "@/components/icons", // Local icon components with barrel file
    ],
  },
  env: {
    // Backend API URL - must be http://localhost:8000 for OAuth to work
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },

  // Proxy API requests to backend during development
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
