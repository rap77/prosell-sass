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
    // For E2E testing, use mock APIs hosted by Next.js itself
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  },
};

export default nextConfig;
