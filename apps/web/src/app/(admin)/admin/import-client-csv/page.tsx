"use client";

/**
 * Admin — F01 client CSV import page.
 *
 * Super-admin-only migration flow for the client's legacy CSV format
 * (semicolon-separated, 24 columns, optional ZIP image association).
 *
 * Backend already implements the endpoints (PR shipped before this PR).
 * This page is the frontend wizard for the flow.
 *
 * Spec: docs/superpowers/specs/2026-06-26-f01-bulk-upload-csv-import-design.md
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useAuth } from "@/hooks/useAuth";
import { orgApi } from "@/lib/api/orgApi";
import { useCategoryOptions } from "@/lib/api/categories";
import { BulkImportClientCSV } from "@/components/admin/BulkImportClientCSV";

export default function ImportClientCSVPage() {
  const isAdmin = useRequireAdmin();
  const { isSuperAdmin } = useAuth();
  const router = useRouter();

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => orgApi.list(),
    enabled: !!isAdmin,
  });

  const { data: categoryOptions, isLoading: catsLoading } =
    useCategoryOptions();

  // Redirect non-super-admins away from this page.
  useEffect(() => {
    if (isAdmin && !isSuperAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, isSuperAdmin, router]);

  if (!isAdmin || !isSuperAdmin) {
    return null;
  }

  const orgs = (orgsData?.organizations ?? []).map((o) => ({ id: o.id, name: o.name }));
  const categories = (categoryOptions ?? []).map((c) => ({
    id: c.value,
    name: c.label,
  }));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 960,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: "var(--ps-text-primary)",
          }}
        >
          Importar CSV del cliente
        </h1>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 13,
            color: "var(--ps-text-secondary)",
          }}
        >
          Migración inicial desde el sistema legacy. Acepta CSV separado por
          punto y coma con 24 columnas + ZIP opcional con imágenes. Idempotente
          por VIN.
        </p>
      </div>

      {orgsLoading || catsLoading ? (
        <p style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>
          Cargando…
        </p>
      ) : (
        <BulkImportClientCSV
          organizations={orgs}
          categories={categories}
          onComplete={() => router.push("/catalog")}
          onCancel={() => router.push("/catalog")}
        />
      )}
    </div>
  );
}
