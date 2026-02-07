/**
 * Register Page
 *
 * Registration page for new user account creation using email/password or OAuth providers.
 * Server Component that renders the RegisterForm client component.
 *
 * Route: /auth/register
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
 */

import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from "next/link";

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
 * - Server Component for optimal performance
 * - Renders RegisterForm Client Component for interactivity
 * - Future: Add redirect if already authenticated
 * - Full metadata for SEO (with noindex)
 *
 * @returns The register page with RegisterForm component
 */
export default function RegisterPage() {
  // TODO: Add server-side authentication check
  // const session = await getServerSession();
  // if (session?.user) {
  //   redirect("/dashboard");
  // }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <svg
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>ProSell</span>
          </Link>
        </div>

        {/* Register Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          <RegisterForm />
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-600 dark:text-slate-400">
          <p>
            By creating an account, you agree to our{" "}
            <Link
              href="/terms"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
