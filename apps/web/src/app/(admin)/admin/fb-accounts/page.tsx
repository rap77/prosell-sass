"use client";

import Link from "next/link";
import { Facebook, Loader2, Plus, AlertTriangle } from "lucide-react";
import { useFBAccounts, useDeleteFBAccount } from "@/lib/api/fb-accounts";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  active: { bg: "bg-green-100", text: "text-green-700", label: "Activa" },
  disabled: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: "Deshabilitada",
  },
  suspended: { bg: "bg-red-100", text: "text-red-700", label: "Suspendida" },
  restricted: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "Restringida",
  },
};

export default function FBAccountsPage() {
  const { data: accounts, isLoading, error } = useFBAccounts();
  const deleteAccount = useDeleteFBAccount();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    return <div className="p-4 text-red-600">Error: {error.message}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-ps-text-primary">
          Cuentas de Facebook Marketplace
        </h1>
        <Link href="/admin/fb-accounts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva cuenta
          </Button>
        </Link>
      </div>

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
                className="bg-white border border-ps-border-default rounded-lg p-4 hover:border-ps-cyan transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Facebook className="h-5 w-5 text-blue-600" />
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
                        <div className="flex items-center gap-1 mt-2 text-sm text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          {account.last_error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
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
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(account.id, account.email)}
                      disabled={deletingId === account.id}
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
