"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Pencil,
  Check,
  X,
  Settings,
} from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import {
  useOrganization,
  useResendOrganizationInvitation,
  useUpdateOrganization,
} from "@/lib/api/organizations";
import { useFBAccounts } from "@/lib/api/fb-accounts";

/**
 * Admin organization detail — Subsystem D Phase 6.
 *
 * Uses `useParams()` (not the `params: Promise<...>` + `use()` pattern)
 * — this page is 100% client-rendered via React Query, so there's no
 * server-streaming benefit to the promise form, and `use()` on a pending
 * promise needs a Suspense boundary to resolve cleanly in jsdom tests.
 */
export default function AdminOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useRequireAdmin();
  const { organization, isLoading, error } = useOrganization(id);
  const resendInvitation = useResendOrganizationInvitation();
  const updateOrganization = useUpdateOrganization();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [fbAccountsOverride, setFbAccountsOverride] = useState<
    string[] | null | undefined
  >();
  const { data: fbAccounts = [] } = useFBAccounts({}, true);

  const handleStartEdit = () => {
    if (organization) {
      setEditedName(organization.name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = async () => {
    if (!organization || !editedName.trim()) return;
    await updateOrganization.mutateAsync({
      organizationId: organization.id,
      data: { name: editedName.trim() },
    });
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-ps-text-secondary">
        <Loader2 size={16} className="animate-spin" />
        Cargando organización…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-ps-error">
        Error al cargar el organización: {error.message}
      </p>
    );
  }

  if (!organization) {
    return (
      <p className="text-ps-text-secondary">Organización no encontrado.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-[13px] text-ps-text-secondary no-underline"
      >
        <ArrowLeft size={14} />
        Organizaciones
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") handleCancelEdit();
              }}
              autoFocus
              className="h-9 min-w-[200px] rounded-lg border border-ps-cyan bg-ps-elevated px-3 text-lg font-bold text-ps-text-primary"
            />
            <button
              type="button"
              onClick={handleSaveName}
              disabled={updateOrganization.isPending || !editedName.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-md border-0 bg-ps-success text-white"
            >
              {updateOrganization.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-ps-border-default bg-ps-elevated text-ps-text-secondary"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <h1 className="m-0 text-[22px] font-bold text-ps-text-primary">
              {organization.name}
            </h1>
            <button
              type="button"
              onClick={handleStartEdit}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-ps-border-default bg-ps-elevated text-ps-text-secondary"
              title="Editar nombre"
            >
              <Pencil size={12} />
            </button>
          </>
        )}
        <span
          className={
            organization.status === "active"
              ? "rounded-xl bg-ps-success-10 px-2.5 py-1 text-xs font-semibold text-ps-success"
              : "rounded-xl bg-ps-warning-10 px-2.5 py-1 text-xs font-semibold text-ps-warning"
          }
        >
          {organization.status === "active" ? "Activo" : "Pendiente"}
        </span>
      </div>

      {/* Pending status explanation */}
      {organization.status === "pending_verification" && (
        <div className="flex flex-col gap-2 rounded-lg border border-ps-warning bg-ps-warning-10 p-4">
          <div className="font-semibold text-ps-warning">
            Esperando aceptación del owner
          </div>
          <div className="text-[13px] text-ps-text-secondary">
            Se envió una invitación por email al owner. La organización se
            activará automáticamente cuando el owner acepte la invitación y
            complete su registro.
          </div>
          <button
            type="button"
            onClick={() => resendInvitation.mutate(organization.id)}
            disabled={resendInvitation.isPending}
            className="h-8 self-start rounded-md border-0 bg-ps-warning px-3 text-xs font-semibold text-white"
          >
            {resendInvitation.isPending ? "Reenviando…" : "Reenviar invitación"}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/admin/organizations/${organization.id}/edit`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ps-border-default bg-ps-elevated px-4 text-[13px] font-semibold text-ps-text-primary no-underline"
        >
          <Settings size={14} />
          Editar información
        </Link>
        <Link
          href={`/admin/organizations/${organization.id}/products`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ps-cyan px-4 text-[13px] font-semibold text-ps-bg-base no-underline"
        >
          Ver productos <ArrowRight size={14} />
        </Link>
      </div>

      {/* FB Account Defaults */}
      {fbAccounts.length > 0 && (
        <FBAccountDefaultsSection
          organization={organization}
          fbAccounts={fbAccounts}
          fbAccountsOverride={fbAccountsOverride}
          setFbAccountsOverride={setFbAccountsOverride}
          updateOrganization={updateOrganization}
        />
      )}
    </div>
  );
}

// ponytail: inline component to avoid prop drilling complexity
function FBAccountDefaultsSection({
  organization,
  fbAccounts,
  fbAccountsOverride,
  setFbAccountsOverride,
  updateOrganization,
}: {
  organization: { id: string; default_fb_account_ids?: string[] | null };
  fbAccounts: {
    id: string;
    email: string;
    alias?: string | null;
    status: string;
    groups_count: number;
  }[];
  fbAccountsOverride: string[] | null | undefined;
  setFbAccountsOverride: (v: string[] | null | undefined) => void;
  updateOrganization: ReturnType<typeof useUpdateOrganization>;
}) {
  // `undefined` means untouched; `null` means all accounts; [] means no defaults.
  const currentSelection =
    fbAccountsOverride !== undefined
      ? fbAccountsOverride
      : (organization.default_fb_account_ids ?? null);
  const isAllAccounts = currentSelection === null;
  const isDirty = fbAccountsOverride !== undefined;

  const handleSave = async () => {
    if (fbAccountsOverride === undefined) return;
    await updateOrganization.mutateAsync({
      organizationId: organization.id,
      data: { default_fb_account_ids: fbAccountsOverride },
    });
    setFbAccountsOverride(undefined);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ps-border-subtle bg-ps-elevated p-4">
      <div className="font-semibold text-ps-text-primary">
        Cuentas FB por defecto
      </div>
      <p className="m-0 text-[13px] text-ps-text-secondary">
        Los productos de esta organización heredarán estas cuentas a menos que
        se configuren específicamente.
      </p>

      {/* All accounts option */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={isAllAccounts}
          onChange={() => setFbAccountsOverride(isAllAccounts ? [] : null)}
          className="h-4 w-4 accent-ps-cyan"
        />
        <span className="text-sm text-ps-text-primary">
          Todas las cuentas activas
        </span>
      </label>

      {/* Individual accounts */}
      {fbAccounts
        .filter((a) => a.status === "active")
        .map((account) => {
          const isSelected =
            !isAllAccounts && (currentSelection ?? []).includes(account.id);
          return (
            <label
              key={account.id}
              className="flex cursor-pointer items-center gap-2"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  const current = currentSelection ?? [];
                  if (e.target.checked) {
                    setFbAccountsOverride([
                      ...current.filter((id) => id !== account.id),
                      account.id,
                    ]);
                  } else {
                    const remaining = current.filter((id) => id !== account.id);
                    setFbAccountsOverride(remaining);
                  }
                }}
                className="h-4 w-4 accent-ps-cyan"
              />
              <span className="text-sm text-ps-text-primary">
                {account.alias || account.email}
                <span className="ml-1 text-ps-text-secondary">
                  ({account.groups_count} grupos)
                </span>
              </span>
            </label>
          );
        })}

      {/* Save button */}
      {isDirty && (
        <button
          type="button"
          onClick={handleSave}
          disabled={updateOrganization.isPending}
          className="h-9 self-start rounded-lg border-0 bg-ps-cyan px-4 text-[13px] font-semibold text-ps-bg-base"
        >
          {updateOrganization.isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      )}
    </div>
  );
}
