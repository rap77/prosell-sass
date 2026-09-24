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
import { useCategories } from "@/lib/api/categories";
import { BulkImportClientCSV } from "@/components/admin/BulkImportClientCSV";

// The vehicles vertical's id is generated at seed time (seed_vehicles_vertical()),
// never a fixed value — only its slug is stable. See project memory
// "u1-cross-org-export-api" interpretation entry.
const VEHICLES_VERTICAL_SLUG = "vehiculos-y-transporte";
// Bugfix (prod, 2026-09-24): the ACTUAL category_id sent to the backend
// must be the schema-bearing leaf ("Carros y Camionetas"), not the
// vertical — the vertical carries no attribute_schema, so every vehicle
// previously imported through this wizard got assigned a category with
// no schema, and its edit form could only render generic/basic fields
// instead of the real vehicle schema (make/model/year/VIN/etc). The
// vertical's name is still shown in the dropdown (human-readable unit,
// per the UX note below) — only the id that gets submitted changes.
const CARS_AND_TRUCKS_LEAF_SLUG = "carros-y-camionetas";

export default function ImportClientCSVPage() {
  const isAdmin = useRequireAdmin();
  const { isSuperAdmin } = useAuth();
  const router = useRouter();

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => orgApi.list(),
    enabled: !!isAdmin,
  });

  const { data: allCategories, isLoading: catsLoading } = useCategories();

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
  // The user sees the parent vertical's name in the dropdown — not the
  // technical leaf-category label — because the vertical is the
  // human-readable unit. When the multi-vertical importer is built, this
  // lookup will move to the `/api/v1/organizations/{id}/verticals` endpoint
  // and the dropdown will offer the full vertical → category tree.
  const vehiclesVertical = allCategories?.find(
    (c) => c.slug === VEHICLES_VERTICAL_SLUG,
  );
  const carsAndTrucksLeaf = allCategories?.find(
    (c) => c.slug === CARS_AND_TRUCKS_LEAF_SLUG,
  );
  // The submitted id is the LEAF's (has the vehicle attribute_schema);
  // the label shown to the user is still the vertical's (human-readable).
  const categories =
    vehiclesVertical && carsAndTrucksLeaf
      ? [{ id: carsAndTrucksLeaf.id, name: vehiclesVertical.name }]
      : [];

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
      ) : !vehiclesVertical || !carsAndTrucksLeaf ? (
        <p className="text-xs text-ps-error">
          No se encontró la categoría &quot;
          {!vehiclesVertical
            ? VEHICLES_VERTICAL_SLUG
            : CARS_AND_TRUCKS_LEAF_SLUG}
          &quot; — no se puede importar hasta que exista.
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
