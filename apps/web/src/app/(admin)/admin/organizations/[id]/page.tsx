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
  Phone,
  Mail,
  MapPin,
  Globe,
  MessageCircle,
  Share2,
  Link2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [fbAccountsOverride, setFbAccountsOverride] = useState<
    string[] | null | undefined
  >();

  // Build WhatsApp-friendly contact text
  const buildContactText = () => {
    if (!organization) return "";
    const lines: string[] = [`📍 ${organization.name}`];
    if (organization.street_address) lines.push(organization.street_address);
    if (organization.city || organization.state) {
      lines.push(
        [organization.city, organization.state].filter(Boolean).join(", "),
      );
    }
    if (organization.phone) lines.push(`📞 ${organization.phone}`);
    if (organization.whatsapp && organization.whatsapp !== organization.phone) {
      lines.push(`💬 ${organization.whatsapp}`);
    }
    return lines.join("\n");
  };

  const buildAddress = () => {
    if (!organization) return "";
    return [
      organization.street_address,
      organization.city,
      organization.state,
      organization.postal_code,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const handleCopy = async (type: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(type);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const shareViaWhatsApp = () => {
    const text = buildContactText();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };
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

      {/* Organization info card */}
      <div className="rounded-xl border border-ps-border-subtle bg-ps-bg-elevated overflow-hidden">
        {/* Color bar */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: organization.color || "#666" }}
        />

        <div className="p-4 flex flex-col gap-4">
          {/* Code + Color row */}
          <div className="flex flex-wrap items-center gap-3">
            {organization.code && (
              <span
                className="px-3 py-1 rounded text-sm font-bold text-white"
                style={{ backgroundColor: organization.color || "#666" }}
              >
                {organization.code}
              </span>
            )}
            {organization.color && (
              <div className="flex items-center gap-2 text-sm text-ps-text-secondary">
                <span
                  className="w-4 h-4 rounded border border-ps-border-default"
                  style={{ backgroundColor: organization.color }}
                />
                {organization.color}
              </div>
            )}
            {(organization.broker_count ?? 0) > 0 && (
              <span className="text-sm text-ps-text-secondary">
                {organization.broker_count} brokers
              </span>
            )}
          </div>

          {/* Contact info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {organization.phone && (
              <div className="flex items-center gap-2 text-ps-text-secondary">
                <Phone size={14} className="text-ps-cyan flex-shrink-0" />
                <span className="text-ps-text-primary">
                  {organization.phone}
                </span>
              </div>
            )}
            {organization.whatsapp && (
              <div className="flex items-center gap-2 text-ps-text-secondary">
                <MessageCircle
                  size={14}
                  className="text-ps-cyan flex-shrink-0"
                />
                <span className="text-ps-text-primary">
                  {organization.whatsapp}
                </span>
              </div>
            )}
            {organization.email && (
              <div className="flex items-center gap-2 text-ps-text-secondary">
                <Mail size={14} className="text-ps-cyan flex-shrink-0" />
                <span className="text-ps-text-primary">
                  {organization.email}
                </span>
              </div>
            )}
            {organization.website && (
              <div className="flex items-center gap-2 text-ps-text-secondary">
                <Globe size={14} className="text-ps-cyan flex-shrink-0" />
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ps-cyan no-underline hover:underline"
                >
                  {organization.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
          </div>

          {/* Address */}
          {(organization.street_address || organization.city) && (
            <div className="flex items-start gap-2 text-sm text-ps-text-secondary">
              <MapPin size={14} className="text-ps-cyan flex-shrink-0 mt-0.5" />
              <span className="text-ps-text-primary">
                {[
                  organization.street_address,
                  organization.city,
                  organization.state,
                  organization.postal_code,
                  organization.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}

          {/* Share dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-ps-text-secondary hover:text-ps-cyan border border-ps-border-default transition-colors"
                style={{ background: "var(--ps-input-bg)" }}
              >
                <Share2 size={14} />
                Compartir
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="min-w-[220px] border-ps-border-default bg-ps-bg-elevated p-1.5"
            >
              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-ps-text-secondary">
                Compartir vía
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-ps-border-subtle" />

              {/* WhatsApp */}
              <DropdownMenuItem
                onClick={shareViaWhatsApp}
                className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-ps-text-primary hover:bg-ps-bg-base"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-500/10 text-green-500">
                  <MessageCircle size={14} />
                </span>
                <span className="text-sm">Enviar por WhatsApp</span>
              </DropdownMenuItem>

              {/* Copy full info */}
              <DropdownMenuItem
                onClick={() => handleCopy("full", buildContactText())}
                className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-ps-text-primary hover:bg-ps-bg-base"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ps-cyan/10 text-ps-cyan">
                  {copiedItem === "full" ? (
                    <Check size={14} />
                  ) : (
                    <Link2 size={14} />
                  )}
                </span>
                <span className="text-sm">
                  {copiedItem === "full" ? "¡Copiado!" : "Copiar info completa"}
                </span>
              </DropdownMenuItem>

              {/* Copy phone */}
              {organization.phone && (
                <DropdownMenuItem
                  onClick={() => handleCopy("phone", organization.phone!)}
                  className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-ps-text-primary hover:bg-ps-bg-base"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ps-bg-base text-ps-text-secondary">
                    {copiedItem === "phone" ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Phone size={14} />
                    )}
                  </span>
                  <span className="text-sm">
                    {copiedItem === "phone" ? "¡Copiado!" : "Copiar teléfono"}
                  </span>
                </DropdownMenuItem>
              )}

              {/* Copy address */}
              {(organization.street_address || organization.city) && (
                <DropdownMenuItem
                  onClick={() => handleCopy("address", buildAddress())}
                  className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-ps-text-primary hover:bg-ps-bg-base"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ps-bg-base text-ps-text-secondary">
                    {copiedItem === "address" ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <MapPin size={14} />
                    )}
                  </span>
                  <span className="text-sm">
                    {copiedItem === "address"
                      ? "¡Copiado!"
                      : "Copiar dirección"}
                  </span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ps-cyan px-4 text-[13px] font-semibold text-ps-base no-underline"
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
          className="h-9 self-start rounded-lg border-0 bg-ps-cyan px-4 text-[13px] font-semibold text-ps-base"
        >
          {updateOrganization.isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      )}
    </div>
  );
}
