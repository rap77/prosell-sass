"use client";

import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/auth/permissions";
import { useDealers } from "@/lib/api/dealers";

/**
 * Admin organizations list — Subsystem D Phase 6.
 *
 * Backend already gates GET /admin/dealers behind
 * Permission.DEALER_ADMIN_VIEW_ALL; this redirect is a client-side UX
 * nicety (the real boundary is the edge middleware in proxy.ts).
 */
export default function AdminOrganizationsPage() {
  const isAdmin = useRequireAdmin();
  const { hasPermission } = useAuth();
  const { data: dealers = [], isLoading, error } = useDealers();

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: "var(--ps-text-primary)",
          }}
        >
          Organizaciones
        </h1>

        {hasPermission(Permission.DEALER_ADMIN_VIEW_ALL) && (
          <Link
            href="/admin/organizations/new"
            style={{
              height: 36,
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              borderRadius: 8,
              background: "var(--ps-cyan)",
              color: "var(--ps-bg-base)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Nueva organización
          </Link>
        )}
      </div>

      {isLoading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--ps-text-secondary)",
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          Cargando organizaciones…
        </div>
      )}

      {error && (
        <p style={{ color: "var(--ps-error)" }}>
          Error al cargar organizaciones: {error.message}
        </p>
      )}

      {!isLoading && !error && dealers.length === 0 && (
        <p style={{ color: "var(--ps-text-secondary)" }}>
          No hay organizaciones registrados.
        </p>
      )}

      <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {dealers.map((dealer) => (
          <li key={dealer.id}>
            <Link
              href={`/admin/organizations/${dealer.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid var(--ps-border-subtle)",
                textDecoration: "none",
                color: "var(--ps-text-primary)",
              }}
            >
              <Building2 size={16} style={{ color: "var(--ps-cyan)" }} />
              {dealer.name}
              {(dealer.broker_count ?? 0) > 0 && (
                <span
                  style={{ fontSize: 12, color: "var(--ps-text-secondary)" }}
                >
                  ({dealer.broker_count} brokers)
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
