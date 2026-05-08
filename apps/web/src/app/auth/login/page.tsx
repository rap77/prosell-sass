/**
 * Login Page
 *
 * Authentication page for user login using email/password or OAuth providers.
 * Server Component that renders LoginPageContent.
 *
 * Route: /auth/login
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
 */

import { LoginPageContent } from "./LoginPageContent";

// ============================================
// METADATA
// ============================================

export const metadata = {
  title: "Sign In | ProSell SaaS",
  description:
    "Sign in to your ProSell account to access your dashboard and analytics.",
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
 * - Client-side auth redirect (via middleware and LoginPageContent)
 * - Renders LoginPageContent for the UI
 *
 * NOTE: Server-side auth check disabled due to Next.js 16 bug
 * The cookies() function takes 80+ seconds in dev mode, causing page hangs.
 * Client-side redirect via useAuth hook handles authenticated users.
 *
 * @returns The login page content
 */
export default async function LoginPage() {
  // NOTE: Server-side auth check disabled due to Next.js 16 cookies() bug
  // The checkAuthServer() function calls cookies() which hangs for 80+ seconds
  // in dev mode. Client-side redirect in useAuth hook handles this instead.

  // const auth = await checkAuthServer();
  // if (auth.isAuthenticated) {
  //   redirect("/dashboard");
  // }

  return <LoginPageContent />;
}
