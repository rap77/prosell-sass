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

  const orgs = (orgsData?.organizations ?? []).map((o) => ({
    id: o.id,
    name: o.name,
  }));
  // ponytail: this importer is hardcoded to the vehicles vertical for now.
  // The user sees the parent vertical's name ("Vehículos y Transporte") in
  // the dropdown — not the technical leaf-category label — because the
  // vertical is the human-readable unit. The UUID is the stable identifier
  // we send to the backend; the display name is the user-facing string.
  // When the multi-vertical importer is built, this lookup will move to
  // the `/api/v1/organizations/{id}/verticals` endpoint and the dropdown
  // will offer the full vertical → category tree.
  const CARS_AND_TRUCKS_CATEGORY_ID = "dae89acf-7c69-4daa-bd64-75352053d014";
  const VEHICLES_VERTICAL_DISPLAY_NAME = "Vehículos y Transporte";
  const categories = [
    {
      id: CARS_AND_TRUCKS_CATEGORY_ID,
      name: VEHICLES_VERTICAL_DISPLAY_NAME,
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="m-0 text-2xl font-bold text-ps-text-primary">
          Importar CSV del cliente
        </h1>
        <p className="mt-1.5 text-xs text-ps-text-secondary">
          Migración inicial desde el sistema legacy. Acepta CSV separado por
          punto y coma con 24 columnas + ZIP opcional con imágenes. Idempotente
          por VIN.
        </p>
      </div>

      {orgsLoading || catsLoading ? (
        <p className="text-xs text-ps-text-secondary">Cargando…</p>
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
