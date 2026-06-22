"use client";

import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useDealers } from "@/lib/api/dealers";

/**
 * Admin dealers list — Subsystem D Phase 6.
 *
 * Backend already gates GET /admin/dealers behind
 * Permission.DEALER_ADMIN_VIEW_ALL; this redirect is a client-side UX
 * nicety (the real boundary is the edge middleware in proxy.ts).
 */
export default function AdminDealersPage() {
  const isAdmin = useRequireAdmin();
  const { data: dealers = [], isLoading, error } = useDealers();

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: "var(--ps-text-primary)",
        }}
      >
        Concesionarios
      </h1>

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
          Cargando concesionarios…
        </div>
      )}

      {error && (
        <p style={{ color: "var(--ps-error)" }}>
          Error al cargar concesionarios: {error.message}
        </p>
      )}

      {!isLoading && !error && dealers.length === 0 && (
        <p style={{ color: "var(--ps-text-secondary)" }}>
          No hay concesionarios registrados.
        </p>
      )}

      <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {dealers.map((dealer) => (
          <li key={dealer.id}>
            <Link
              href={`/admin/dealers/${dealer.id}`}
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
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
