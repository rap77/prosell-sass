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

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RegisterPageContent } from "./RegisterPageContent";

// ============================================
// METADATA
// ============================================

export const metadata = {
  title: "Sign Up | ProSell SaaS",
  description: "Create your ProSell account to start analyzing vehicle markets and getting real-time insights.",
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
  // Server-side authentication check (defense in depth)
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const userDataCookie = cookieStore.get("user_data")?.value;

  // If user is authenticated, redirect to dashboard
  if (accessToken && userDataCookie) {
    redirect("/dashboard");
  }

  return <RegisterPageContent />;
}
