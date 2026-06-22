"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useDealerProducts } from "@/lib/api/dealers";

/**
 * Admin dealer products list — Subsystem D Phase 6.
 *
 * Uses `useParams()` — see AdminDealerDetailPage for why (no server
 * benefit from `params: Promise<...>` on a 100% client-rendered page).
 */
export default function AdminDealerProductsPage() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useRequireAdmin();
  const { data: products = [], isLoading, error } = useDealerProducts(id);

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ps-text-secondary)",
        }}
      >
        <Loader2 size={16} className="animate-spin" />
        Cargando productos…
      </div>
    );
  }

  if (error) {
    return (
      <p style={{ color: "var(--ps-error)" }}>
        Error al cargar productos: {error.message}
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: "var(--ps-text-primary)",
        }}
      >
        Productos del concesionario
      </h1>

      {products.length === 0 ? (
        <p style={{ color: "var(--ps-text-secondary)" }}>Sin productos.</p>
      ) : (
        <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {products.map((product) => (
            <li
              key={product.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid var(--ps-border-subtle)",
                color: "var(--ps-text-primary)",
              }}
            >
              <span>{product.title}</span>
              <span style={{ fontFamily: "ui-monospace, monospace" }}>
                ${(product.price_cents / 100).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
