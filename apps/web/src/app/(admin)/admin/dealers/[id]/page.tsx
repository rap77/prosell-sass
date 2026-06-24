"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useDealer, useResendDealerInvitation } from "@/lib/api/dealers";

/**
 * Admin dealer detail — Subsystem D Phase 6.
 *
 * Uses `useParams()` (not the `params: Promise<...>` + `use()` pattern)
 * — this page is 100% client-rendered via React Query, so there's no
 * server-streaming benefit to the promise form, and `use()` on a pending
 * promise needs a Suspense boundary to resolve cleanly in jsdom tests.
 */
export default function AdminDealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useRequireAdmin();
  const { dealer, isLoading, error } = useDealer(id);
  const resendInvitation = useResendDealerInvitation();

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
        Cargando concesionario…
      </div>
    );
  }

  if (error) {
    return (
      <p style={{ color: "var(--ps-error)" }}>
        Error al cargar el concesionario: {error.message}
      </p>
    );
  }

  if (!dealer) {
    return (
      <p style={{ color: "var(--ps-text-secondary)" }}>
        Concesionario no encontrado.
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
        {dealer.name}
      </h1>
      <p style={{ margin: 0, color: "var(--ps-text-secondary)" }}>
        Estado: {dealer.status}
      </p>
      {dealer.status === "pending_verification" && (
        <button
          type="button"
          onClick={() => resendInvitation.mutate(dealer.id)}
          disabled={resendInvitation.isPending}
          style={{
            alignSelf: "flex-start",
            height: 36,
            padding: "0 16px",
            borderRadius: 8,
            background: "var(--ps-bg-elevated)",
            border: "1px solid var(--ps-border-default)",
            color: "var(--ps-text-secondary)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {resendInvitation.isPending ? "Reenviando…" : "Reenviar invitación"}
        </button>
      )}
      <Link
        href={`/admin/dealers/${dealer.id}/products`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--ps-cyan)",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 13.5,
        }}
      >
        Ver productos <ArrowRight size={14} />
      </Link>
    </div>
  );
}
