"use client";

/**
 * Setup2FAPageContent — componente cliente de la página de configuración 2FA.
 *
 * La página server async (page.tsx) maneja la redirección de auth y renderiza esto.
 */

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { TwoFactorSetupSkeleton } from "@/components/auth/dynamic/TwoFactorSetupForm";

// Carga dinámica del formulario de setup 2FA
const TwoFactorSetupForm = dynamic(
  () =>
    import("@/components/auth/dynamic/TwoFactorSetupForm").then(
      (mod) => mod.TwoFactorSetupForm,
    ),
  {
    ssr: false,
    loading: () => <TwoFactorSetupSkeleton />,
  },
);

interface Setup2FAPageContentProps {
  is2FAEnabled?: boolean;
}

export function Setup2FAPageContent({
  is2FAEnabled = false,
}: Setup2FAPageContentProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[448px]">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight text-foreground no-underline"
          >
            <Image
              src="/logo-mark.png"
              alt="ProSell"
              width={271}
              height={294}
              className="h-8 w-auto shrink-0"
            />
            ProSell
          </Link>
        </div>

        {/* Form */}
        <Suspense fallback={<TwoFactorSetupSkeleton />}>
          <TwoFactorSetupForm is2FAEnabled={is2FAEnabled} />
        </Suspense>
      </div>
    </div>
  );
}
