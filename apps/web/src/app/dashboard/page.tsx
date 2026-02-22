/**
 * Dashboard Page (Protected Route)
 *
 * This page requires authentication. The middleware will redirect
 * unauthenticated users to /auth/login.
 */

import { redirect } from "next/navigation";

export default function DashboardPage() {
  // TODO: Fetch user data from server session
  // For now, this is a placeholder to verify route protection works

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">
          Dashboard
        </h1>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Welcome to your dashboard!
          </p>

          <p className="text-sm text-slate-500 dark:text-slate-500">
            This is a protected route. If you can see this, authentication is
            working correctly.
          </p>

          {/* TODO: Add dashboard widgets */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Analytics
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Coming soon...
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Products
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Coming soon...
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Appointments
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
