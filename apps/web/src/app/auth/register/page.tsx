/**
 * Register Page
 *
 * Registration page for new user account creation using email/password or OAuth providers.
 * Server Component that checks authentication and renders RegisterPageContent.
 *
 * Route: /auth/register
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
 */

import { checkAuthServer } from "@/lib/auth/server-check";
import { redirect } from "next/navigation";
import { RegisterPageContent } from "./RegisterPageContent";

// ============================================
// METADATA
// ============================================

export const metadata = {
  title: "Sign Up | ProSell SaaS",
  description:
    "Create your ProSell account to start analyzing vehicle markets and getting real-time insights.",
  robots: {
    index: false, // Don't index authentication pages
    follow: false,
  },
};

// ============================================
// PAGE COMPONENT
// ============================================

/**
 * Register page component
 *
 * Features:
 * - Async Server Component for optimal performance
 * - Server-side authentication check (defense in depth)
 * - Redirects to dashboard if already authenticated
 * - Renders RegisterPageContent for the UI
 *
 * @returns The register page content or redirect to dashboard
 */
export default async function RegisterPage() {
  // Server-side authentication check (cached per request with React.cache)
  // Vercel best practice: authenticate at the page level, not just middleware
  const auth = await checkAuthServer();

  // If user is authenticated, redirect to dashboard
  // This prevents flash of register page and improves perceived performance
  if (auth.isAuthenticated) {
    redirect("/dashboard");
  }

  return <RegisterPageContent />;
}
