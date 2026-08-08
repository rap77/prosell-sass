"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Building2,
  Loader2,
  Search,
  Phone,
  MapPin,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/auth/permissions";
import { useOrganizations } from "@/lib/api/organizations";

/**
 * Admin organizations list with search, cards, and copy-to-clipboard for WhatsApp.
 */
export default function AdminOrganizationsPage() {
  const isAdmin = useRequireAdmin();
  const { hasPermission } = useAuth();
  const { data: organizations = [], isLoading, error } = useOrganizations();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter organizations by search term
  const filtered = useMemo(() => {
    if (!search.trim()) return organizations;
    const q = search.toLowerCase();
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.code?.toLowerCase().includes(q) ||
        org.city?.toLowerCase().includes(q) ||
        org.phone?.includes(q),
    );
  }, [organizations, search]);

  // Build WhatsApp-friendly contact text (plain text, no emojis for encoding safety)
  const buildContactText = (org: (typeof organizations)[0]) => {
    const lines: string[] = [org.name];
    if (org.street_address) lines.push(org.street_address);
    if (org.city || org.state) {
      lines.push([org.city, org.state].filter(Boolean).join(", "));
    }
    if (org.phone) lines.push(`Tel: ${org.phone}`);
    if (org.whatsapp && org.whatsapp !== org.phone) {
      lines.push(`WhatsApp: ${org.whatsapp}`);
    }
    return lines.join("\n");
  };

  const handleCopy = async (org: (typeof organizations)[0]) => {
    const text = buildContactText(org);
    await navigator.clipboard.writeText(text);
    setCopiedId(org.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="m-0 text-[22px] font-bold text-ps-text-primary">
          Organizaciones
          {!isLoading && (
            <span className="ml-2 text-sm font-normal text-ps-text-secondary">
              ({filtered.length})
            </span>
          )}
        </h1>

        {hasPermission(Permission.ORG_ADMIN_VIEW_ALL) && (
          <Link
            href="/admin/organizations/new"
            className="h-9 px-[14px] inline-flex items-center justify-center gap-[6px] bg-ps-cyan text-ps-base border-0 rounded-lg text-[13px] font-semibold no-underline whitespace-nowrap w-full md:w-auto"
          >
            Nueva organización
          </Link>
        )}
      </div>

      {/* Search bar — styled like catalog */}
      <div className="relative">
        <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-ps-tertiary pointer-events-none inline-flex">
          <Search size={14} strokeWidth={2} />
        </span>
        <input
          type="search"
          placeholder="Buscar por nombre, código, ciudad o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={cn(
            "h-9 w-full pl-8 pr-3 border rounded-lg text-ps-text-primary text-[13px] outline-none box-border",
            searchFocused
              ? "border-ps-border-active shadow-input-focus"
              : "border-ps-border-default",
          )}
          style={{ background: "var(--ps-input-bg)" }}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-ps-text-secondary">
          <Loader2 size={16} className="animate-spin" />
          Cargando organizaciones…
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-ps-error">
          Error al cargar organizaciones: {error.message}
        </p>
      )}

      {/* Empty state */}
      {!isLoading && !error && organizations.length === 0 && (
        <p className="text-ps-text-secondary">
          No hay organizaciones registradas.
        </p>
      )}

      {/* No results */}
      {!isLoading &&
        !error &&
        organizations.length > 0 &&
        filtered.length === 0 && (
          <p className="text-ps-text-secondary">
            No se encontraron organizaciones para "{search}"
          </p>
        )}

      {/* Organizations grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((org) => (
          <div
            key={org.id}
            className="flex flex-col rounded-xl border border-ps-border-subtle bg-ps-bg-elevated overflow-hidden hover:border-ps-border-medium transition-colors"
          >
            {/* Card header with color bar */}
            <div
              className="h-2 w-full"
              style={{ backgroundColor: org.color || "#666" }}
            />

            <div className="flex flex-col gap-3 p-4">
              {/* Name and code */}
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/admin/organizations/${org.id}`}
                  className="flex items-center gap-2 text-ps-text-primary no-underline hover:text-ps-cyan transition-colors"
                >
                  <Building2 size={18} className="text-ps-cyan flex-shrink-0" />
                  <span className="font-semibold truncate">{org.name}</span>
                </Link>

                {org.code && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: org.color || "#666" }}
                  >
                    {org.code}
                  </span>
                )}
              </div>

              {/* Contact info */}
              <div className="flex flex-col gap-1.5 text-sm text-ps-text-secondary">
                {(org.street_address || org.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="flex-shrink-0 mt-0.5" />
                    <span className="truncate">
                      {[org.street_address, org.city, org.state]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}

                {org.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="flex-shrink-0" />
                    <span>{org.phone}</span>
                  </div>
                )}

                {org.whatsapp && (
                  <div className="flex items-center gap-2">
                    <MessageCircle size={14} className="flex-shrink-0" />
                    <span>{org.whatsapp}</span>
                  </div>
                )}
              </div>

              {/* Footer: brokers count + copy button */}
              <div className="flex items-center justify-between pt-2 border-t border-ps-border-subtle">
                <span className="text-xs text-ps-text-secondary">
                  {(org.broker_count ?? 0) > 0
                    ? `${org.broker_count} brokers`
                    : "Sin brokers"}
                </span>

                <button
                  type="button"
                  onClick={() => handleCopy(org)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-ps-text-secondary hover:text-ps-cyan hover:bg-ps-bg-base transition-colors"
                  title="Copiar info para WhatsApp"
                >
                  {copiedId === org.id ? (
                    <>
                      <Check size={14} className="text-green-500" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
