/**
 * RegisterPageContent - Client component with the register page UI
 *
 * This component contains all the visual elements of the register page.
 * The async server page (page.tsx) handles auth redirect and renders this.
 */

"use client";

import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export function RegisterPageContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4 py-12 sm:px-6 lg:px-8">
      <main className="max-w-md w-full space-y-8">
        {/* Hidden h1 for accessibility (required by WCAG) */}
        <h1 className="sr-only">Create your account - ProSell</h1>

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
          {/* Use h2 for proper heading order after h1 (sr-only) */}
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Start your 14-day free trial. No credit card required.
          </p>
        </div>

        {/* Register Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          <RegisterForm />
        </div>

        {/* Sign In Link */}
        <div className="text-center text-sm text-slate-600 dark:text-slate-400">
          <p>
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Sign in
            </Link>
          </p>
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
      </main>
    </div>
  );
}
