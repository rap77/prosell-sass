"use client";

import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/auth/permissions";
import { useOrganizations } from "@/lib/api/organizations";

/**
 * Admin organizations list — Subsystem D Phase 6.
 *
 * Backend already gates GET /admin/organizations behind
 * Permission.ORG_ADMIN_VIEW_ALL; this redirect is a client-side UX
 * nicety (the real boundary is the edge middleware in proxy.ts).
 */
export default function AdminOrganizationsPage() {
  const isAdmin = useRequireAdmin();
  const { hasPermission } = useAuth();
  const { data: organizations = [], isLoading, error } = useOrganizations();

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <h1 className="m-0 text-[22px] font-bold text-ps-text-primary">
          Organizaciones
        </h1>

        {hasPermission(Permission.ORG_ADMIN_VIEW_ALL) && (
          <Link
            href="/admin/organizations/new"
            className="h-11 flex items-center justify-center px-[14px] rounded-lg bg-ps-cyan text-ps-bg-base font-bold no-underline w-full md:w-auto"
          >
            Nueva organización
          </Link>
        )}
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
          No hay organizaciones registrados.
        </p>
      )}

      {/* Organizations list */}
      <ul className="flex flex-col gap-2 p-0 m-0 list-none">
        {organizations.map((organization) => (
          <li key={organization.id}>
            <Link
              href={`/admin/organizations/${organization.id}`}
              className="flex items-center gap-[10px] p-3 md:px-4 min-h-[44px] rounded-lg border border-ps-border-subtle no-underline text-ps-text-primary hover:border-ps-border-medium transition-colors"
            >
              <Building2 size={16} className="text-ps-cyan flex-shrink-0" />
              <span className="flex-1 truncate">{organization.name}</span>
              {(organization.broker_count ?? 0) > 0 && (
                <span className="text-[12px] text-ps-text-secondary flex-shrink-0">
                  ({organization.broker_count} brokers)
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
