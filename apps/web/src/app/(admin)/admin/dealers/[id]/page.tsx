"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDealer } from "@/lib/api/dealers";

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
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { dealer, isLoading, error } = useDealer(id);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

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
        <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
        Cargando concesionario…
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
