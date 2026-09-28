/**
 * QuickFilters — header-level filters for the catalog page.
 *
 * Three URL-driven controls:
 *   - Status (dropdown of statuses currently present in the loaded products)
 *   - "Publicado en Marketplace" — three-state toggle (Cualquier / Sí / No)
 *   - "Tiene imágenes" — same three-state pattern
 *
 * URL params:
 *   - status         (already wired before this component existed; same shape)
 *   - published      (true / false / absent for "Todos")
 *   - has_images     (true / false / absent for "Todos")
 *
 * Status dropdown values come from the `statusOrder` (all possible
 * `VehicleStatus` values), not from the loaded products. Showing only
 * statuses present in the current page creates a UX trap: picking one
 * status hides the other options, so the seller can't switch between
 * them without first clearing the filter.
 *
 * NOTE: a fuller "only-applied" implementation would need a backend
 * facets endpoint (`GET /products/status-facets`) that returns the
 * distinct statuses present in the user's catalog regardless of the
 * current filter set. Tracked separately.
 *
 * The toggle groups are explicit buttons (not `<select>`s) because the
 * third "Todos" state is a clearer reset action when it has its own
 * button than as a dropdown option.
 *
 * "Aprobado para Marketplace" labels the boolean filter on the
 * `published_to_marketplace` column — set by `Product.approve()` when a
 * pending product is approved at the prosel-sass level. The actual
 * publication to Facebook Marketplace is handled by the separate
 * `fb-autopost` desktop app (currently in development), which can push a
 * single approved product to multiple Facebook accounts. So the toggle
 * filters by *approval*, not by *live status*.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/types/product";
import type { VehicleStatus } from "@/components/datagrid/StatusBadge";
import {
  mapProductStatusToVehicleStatus,
  mapVehicleStatusToProductStatus,
} from "@/lib/utils/mapProductStatusToVehicleStatus";
import { cn } from "@/lib/utils";

interface QuickFiltersProps {
  /** Loaded products used to derive the status dropdown options. */
  products: Product[];
  /**
   * Display order for the status dropdown. Same array used by the
   * "Por estado" view in `catalog/page.tsx` so the labels and order match.
   */
  statusOrder: readonly VehicleStatus[];
}

const STATUS_LABELS: Record<VehicleStatus, string> = {
  published: "Publicado",
  reserved: "Apartado",
  online: "Online",
  pending: "Pendiente",
  draft: "Borrador",
  maintenance: "En mantenimiento",
  expired: "Expirado",
  failed: "Rechazado",
  sold: "Vendido",
};

type TriState = "any" | "true" | "false";

function parseTriState(raw: string | null): TriState {
  if (raw === "true") return "true";
  if (raw === "false") return "false";
  return "any";
}

function TriStateToggle({
  label,
  value,
  onChange,
  testIdPrefix,
}: {
  label: string;
  value: TriState;
  onChange: (next: TriState) => void;
  testIdPrefix: string;
}) {
  const options: { state: TriState; text: string }[] = [
    { state: "any", text: "Todos" },
    { state: "true", text: "Sí" },
    { state: "false", text: "No" },
  ];
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-9 items-stretch rounded-lg border border-ps-border-default bg-ps-input-bg overflow-hidden"
    >
      <span className="inline-flex items-center px-2.5 text-[12px] font-medium text-ps-text-secondary border-r border-ps-border-default">
        {label}
      </span>
      {options.map((option) => {
        const active = option.state === value;
        return (
          <button
            key={option.state}
            type="button"
            aria-pressed={active}
            data-testid={`${testIdPrefix}-${option.state}`}
            onClick={() => onChange(option.state)}
            className={cn(
              "px-2.5 text-[12px] font-medium cursor-pointer transition-colors border-0 border-r border-ps-border-default last:border-r-0",
              active
                ? "bg-ps-cyan text-ps-base"
                : "bg-transparent text-ps-text-primary hover:bg-ps-hover-bg-xs",
            )}
          >
            {option.text}
          </button>
        );
      })}
    </div>
  );
}

export function QuickFilters({ products, statusOrder }: QuickFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get("status");
  const publishedParam = searchParams.get("published");
  const hasImagesParam = searchParams.get("has_images");

  // Capture the *applied* statuses (the subset present in the user's
  // catalog) on the FIRST render where products are loaded and no status
  // filter is active. Once captured, the list is frozen — picking a
  // status doesn't shrink the dropdown to just that status + "Todos",
  // so the seller can switch between applied statuses freely.
  //
  // The state is initialized after products load, then intentionally kept
  // unchanged so selecting a status never collapses the options list.
  //
  // Edge cases handled:
  //   - products still loading       → state stays null → falls back to
  //                                    full `statusOrder`
  //   - page loaded with ?status=...  → state stays null while filter is
  //                                    active; falls back to full
  //                                    statusOrder; state captures the
  //                                    next time the user clears the
  //                                    filter and products reload
  //                                    unfiltered
  const [appliedStatuses, setAppliedStatuses] = useState<
    VehicleStatus[] | null
  >(null);
  useEffect(() => {
    if (appliedStatuses !== null || statusParam || products.length === 0) {
      return;
    }

    const present = new Set(
      products.map((product) =>
        mapProductStatusToVehicleStatus(product.status),
      ),
    );
    // The source changes asynchronously from the catalog query. This one-time
    // state capture is the observable behavior: it freezes the applied list.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above.
    setAppliedStatuses(statusOrder.filter((status) => present.has(status)));
  }, [appliedStatuses, products, statusOrder, statusParam]);

  // First-render fallback (before products load, or while a status
  // filter is in the URL): show the full status order. After capture,
  // return the frozen "applied" subset.
  const availableStatuses: VehicleStatus[] = appliedStatuses ?? [
    ...statusOrder,
  ];

  function updateParam(key: string, next: string | null) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set(key, next);
    else params.delete(key);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function setStatus(value: string) {
    updateParam("status", value || null);
  }

  function setPublished(state: TriState) {
    updateParam("published", state === "any" ? null : state);
  }

  function setHasImages(state: TriState) {
    updateParam("has_images", state === "any" ? null : state);
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2.5"
      data-testid="quick-filters"
    >
      {/* Status dropdown */}
      <label className="inline-flex items-center gap-2 h-9 px-2.5 rounded-lg border border-ps-border-default bg-ps-input-bg">
        <span className="text-[12px] font-medium text-ps-text-secondary">
          Estado
        </span>
        <select
          aria-label="Estado del flujo"
          data-testid="quick-filters-status-select"
          value={statusParam ?? ""}
          onChange={(e) => setStatus(e.target.value)}
          // `color-scheme: dark` tells the browser to render the native
          // dropdown options with a dark palette — without it the
          // open-options popup inherits the OS light theme and the text
          // is invisible against the project's dark background.
          className="bg-ps-input-bg text-[13px] text-ps-text-primary outline-none cursor-pointer"
          style={{ colorScheme: "dark" }}
        >
          <option value="">Todos</option>
          {availableStatuses.map((status) => (
            <option
              key={status}
              value={mapVehicleStatusToProductStatus(status)}
            >
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <TriStateToggle
        label="Aprobado para Marketplace"
        value={parseTriState(publishedParam)}
        onChange={setPublished}
        testIdPrefix="quick-filters-published"
      />

      <TriStateToggle
        label="Tiene imágenes"
        value={parseTriState(hasImagesParam)}
        onChange={setHasImages}
        testIdPrefix="quick-filters-has-images"
      />
    </div>
  );
}
