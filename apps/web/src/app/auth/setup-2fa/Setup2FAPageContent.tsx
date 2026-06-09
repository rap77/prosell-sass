/**
 * Setup2FAPageContent — componente cliente de la página de configuración 2FA.
 *
 * La página server async (page.tsx) maneja la redirección de auth y renderiza esto.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */
"use client";

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
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ps-bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 448 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--ps-text-primary)",
              textDecoration: "none",
            }}
          >
            <Image
              src="/logo-mark.png"
              alt="ProSell"
              width={271}
              height={294}
              style={{ height: 32, width: "auto", flexShrink: 0 }}
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
