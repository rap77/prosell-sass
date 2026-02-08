/**
 * Profile Page (Protected Route)
 *
 * This page requires authentication. The middleware will redirect
 * unauthenticated users to /auth/login.
 */

import Link from "next/link";

export default function ProfilePage() {
  // TODO: Fetch user data from server session
  // For now, this is a placeholder to verify route protection works

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">
          Profile
        </h1>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Manage your profile settings here.
          </p>

          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Account Information
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Account details coming soon...
              </p>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Security
              </h2>
              <Link
                href="/auth/setup-2fa"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 block"
              >
                Configure Two-Factor Authentication →
              </Link>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Preferences
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Preferences coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
