"use client";

import Link from "next/link";
import {
  Facebook,
  Loader2,
  Plus,
  AlertTriangle,
  Key,
  Copy,
  Check,
} from "lucide-react";
import {
  useFBAccounts,
  useDeleteFBAccount,
  useCreateMigrationToken,
} from "@/lib/api/fb-accounts";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  active: { bg: "bg-ps-success-bg", text: "text-ps-success", label: "Activa" },
  pending_verification: {
    bg: "bg-ps-warning-bg",
    text: "text-ps-warning",
    label: "Pendiente",
  },
  verification_failed: {
    bg: "bg-ps-error-bg",
    text: "text-ps-error",
    label: "Verificación fallida",
  },
  disabled: {
    bg: "bg-ps-elevated",
    text: "text-ps-text-secondary",
    label: "Deshabilitada",
  },
  suspended: {
    bg: "bg-ps-error-bg",
    text: "text-ps-error",
    label: "Suspendida",
  },
  restricted: {
    bg: "bg-ps-warning-bg",
    text: "text-ps-warning",
    label: "Restringida",
  },
};

export default function FBAccountsPage() {
  const { data: accounts, isLoading, error } = useFBAccounts();
  const deleteAccount = useDeleteFBAccount();
  const createMigrationToken = useCreateMigrationToken();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [migrationToken, setMigrationToken] = useState<{
    token: string;
    expires_at: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerateToken() {
    const result = await createMigrationToken.mutateAsync(15);
    setMigrationToken(result);
    setCopied(false);
  }

  function handleCopyToken() {
    if (migrationToken) {
      navigator.clipboard.writeText(migrationToken.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`¿Eliminar la cuenta ${email}?`)) return;
    setDeletingId(id);
    try {
      await deleteAccount.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ps-cyan" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-ps-error">Error: {error.message}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-ps-text-primary">
          Cuentas de Facebook Marketplace
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateToken}
            disabled={createMigrationToken.isPending}
          >
            {createMigrationToken.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Key className="h-4 w-4 mr-2" />
            )}
            Token de Migración
          </Button>
          <Link href="/admin/fb-accounts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva cuenta
            </Button>
          </Link>
        </div>
      </div>

      {/* Migration Token Modal */}
      {migrationToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-ps-border-subtle bg-ps-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-ps-text-primary mb-4">
              Token de Migración Generado
            </h2>
            <p className="text-sm text-ps-text-secondary mb-4">
              Este token es de un solo uso y expira en 15 minutos. Copialo y
              usalo en el bot para importar las cuentas.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 rounded bg-ps-elevated px-3 py-2 text-sm font-mono text-ps-text-primary break-all">
                {migrationToken.token}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopyToken}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-ps-text-secondary mb-4">
              Expira: {new Date(migrationToken.expires_at).toLocaleString()}
            </p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setMigrationToken(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {!accounts?.length ? (
        <div className="text-center py-12 text-ps-text-secondary">
          No hay cuentas configuradas. Creá una para empezar.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const status =
              STATUS_STYLES[account.status] ?? STATUS_STYLES.active;
            const hasError =
              account.status === "suspended" || account.status === "restricted";

            return (
              <div
                key={account.id}
                className="rounded-lg border border-ps-border-subtle bg-ps-surface p-4 transition-colors hover:border-ps-border-medium"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-ps-info-bg p-2">
                      <Facebook className="h-5 w-5 text-ps-cyan" />
                    </div>
                    <div>
                      <div className="font-medium text-ps-text-primary">
                        {account.email}
                      </div>
                      {account.alias && (
                        <div className="text-sm text-ps-text-secondary">
                          {account.alias}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-sm text-ps-text-secondary">
                        <span>{account.groups_count} grupos activos</span>
                        <span>·</span>
                        <span>{account.total_publications} publicaciones</span>
                        {account.last_used_at && (
                          <>
                            <span>·</span>
                            <span>
                              Última:{" "}
                              {new Date(
                                account.last_used_at,
                              ).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                      {hasError && account.last_error && (
                        <div className="mt-2 flex items-center gap-1 text-sm text-ps-error">
                          <AlertTriangle className="h-3 w-3" />
                          {account.last_error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>
                    <Link href={`/admin/fb-accounts/${account.id}`}>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(account.id, account.email)}
                      disabled={deletingId === account.id}
                      className="border-ps-error bg-transparent text-ps-error hover:bg-ps-error-bg hover:text-ps-error"
                    >
                      {deletingId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Eliminar"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
