/**
 * Terms of Service Page
 *
 * Placeholder page for Terms of Service - to be implemented
 */

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Terms of Service
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Coming Soon
              </p>
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <p>The Terms of Service page is currently under development. Please check back soon for the complete terms and conditions governing the use of ProSell SaaS.</p>

              <p>For any immediate questions or concerns regarding our terms of service, please contact our legal team at legal@prosell.saas.</p>
            </div>

            <div className="text-center mt-8">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ← Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}