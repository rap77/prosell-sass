"use client";

import Link from "next/link";
import { ArrowLeft, CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { useFBAccounts } from "@/lib/api/fb-accounts";
import { Button } from "@/components/ui/button";

const STATUS_LABELS = {
  pending_verification: "Pendiente de verificación",
  verification_failed: "Verificación fallida",
} as const;

export default function FBAccountVerificationPage() {
  const {
    data: accounts,
    isLoading,
    error,
  } = useFBAccounts({
    statuses: ["pending_verification", "verification_failed"],
    migratedOnly: true,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ps-cyan" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-ps-error">Error: {error.message}</div>;
  }

  return (
    <div className="p-6">
      <Link
        href="/admin/fb-accounts"
        className="inline-flex items-center text-sm text-ps-text-secondary hover:text-ps-text-primary"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Volver a cuentas activas
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ps-text-primary">
            Verificación de cuentas migradas
          </h1>
          <p className="mt-1 text-sm text-ps-text-secondary">
            El bot valida el inicio de sesión y activa cada cuenta
            automáticamente.
          </p>
        </div>
        <ShieldCheck className="h-7 w-7 shrink-0 text-ps-cyan" />
      </div>

      {!accounts?.length ? (
        <div className="mt-6 rounded-lg border border-ps-border-subtle bg-ps-surface p-6 text-center text-ps-text-secondary">
          No hay cuentas migradas pendientes de verificación.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {accounts.map((account) => {
            const isFailed = account.status === "verification_failed";
            const label = isFailed
              ? STATUS_LABELS.verification_failed
              : STATUS_LABELS.pending_verification;

            return (
              <div
                key={account.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-ps-border-subtle bg-ps-surface p-4"
              >
                <div>
                  <p className="font-medium text-ps-text-primary">
                    {account.email}
                  </p>
                  {account.alias && (
                    <p className="text-sm text-ps-text-secondary">
                      {account.alias}
                    </p>
                  )}
                  {isFailed && account.last_error && (
                    <p className="mt-2 flex items-center gap-1 text-sm text-ps-error">
                      <CircleAlert className="h-4 w-4" />
                      {account.last_error}
                    </p>
                  )}
                </div>
                <span
                  className={
                    isFailed
                      ? "rounded bg-ps-error-bg px-2 py-1 text-xs font-medium text-ps-error"
                      : "rounded bg-ps-warning-bg px-2 py-1 text-xs font-medium text-ps-warning"
                  }
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Link href="/admin/fb-accounts">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>
    </div>
  );
}
