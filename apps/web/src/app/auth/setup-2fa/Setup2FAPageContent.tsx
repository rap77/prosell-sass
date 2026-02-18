/**
 * Setup2FAPageContent - Client component with the 2FA setup page UI
 *
 * This component contains all the visual elements of the 2FA setup page.
 * The async server page (page.tsx) handles auth redirect and renders this.
 */
'use client';

import Link from "next/link";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { TwoFactorSetupSkeleton } from "@/components/auth/dynamic/TwoFactorSetupForm";

// Dynamically load the TwoFactorSetupForm component
const TwoFactorSetupForm = dynamic(
  () => import("@/components/auth/dynamic/TwoFactorSetupForm").then((mod) => mod.TwoFactorSetupForm),
  {
    ssr: false,
    loading: () => <TwoFactorSetupSkeleton />
  }
);

interface Setup2FAPageContentProps {
  is2FAEnabled?: boolean;
}

export function Setup2FAPageContent({ is2FAEnabled = false }: Setup2FAPageContentProps) {
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
