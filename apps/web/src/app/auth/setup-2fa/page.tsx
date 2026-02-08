/**
 * 2FA Setup Page
 *
 * Server Component that renders the TwoFactorSetupForm.
 * Users can enable or disable two-factor authentication from this page.
 *
 * NOTE: Route protection will be added in Task #15
 */

import Link from "next/link";
import { TwoFactorSetupForm } from "@/components/auth/TwoFactorSetupForm";

export default function Setup2FAPage() {
  // For now, default to false (2FA not enabled)
  // In Task #15, we'll get this from server session
  const is2FAEnabled = false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100"
          >
            <svg
              className="w-8 h-8 text-blue-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>ProSell</span>
          </Link>
        </div>

        {/* TwoFactorSetupForm */}
        <TwoFactorSetupForm is2FAEnabled={is2FAEnabled} />
      </div>
    </div>
  );
}
