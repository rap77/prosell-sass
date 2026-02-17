/**
 * Login Page
 *
 * Authentication page for user login using email/password or OAuth providers.
 * Server Component that checks authentication and renders LoginPageContent.
 *
 * Route: /auth/login
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
 */

import { checkAuthServer } from "@/lib/auth/server-check";
import { redirect } from "next/navigation";
import { LoginPageContent } from "./LoginPageContent";

// ============================================
// METADATA
// ============================================

export const metadata = {
  title: "Sign In | ProSell SaaS",
  description: "Sign in to your ProSell account to access your dashboard and analytics.",
  robots: {
    index: false, // Don't index authentication pages
    follow: false,
  },
};

// ============================================
// PAGE COMPONENT
// ============================================

/**
 * Login page component
 *
 * Features:
 * - Async Server Component for optimal performance
 * - Server-side authentication check (defense in depth)
 * - Redirects to dashboard if already authenticated
 * - Renders LoginPageContent for the UI
 *
 * @returns The login page content or redirect to dashboard
 */
export default async function LoginPage() {
  // Server-side authentication check (cached per request with React.cache)
  // Vercel best practice: authenticate at the page level, not just middleware
  const auth = await checkAuthServer();

  // If user is authenticated, redirect to dashboard
  // This prevents flash of login page and improves perceived performance
  if (auth.isAuthenticated) {
    redirect("/dashboard");
  }

  return <LoginPageContent />;
}
