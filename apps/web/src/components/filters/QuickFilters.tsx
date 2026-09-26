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
 *   - published      (true / false / absent for Cualquier)
 *   - has_images     (true / false / absent for Cualquier)
 *
 * Status dropdown values come from the loaded products so the seller never
 * sees a status that would always return zero rows in the current view.
 * The toggle groups are explicit buttons (not `<select>`s) because the
 * third "Cualquier" state is a clearer reset action when it has its own
 * button than as a dropdown option.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/types/product";
import type { VehicleStatus } from "@/components/datagrid/StatusBadge";
import { mapProductStatusToVehicleStatus } from "@/lib/utils/mapProductStatusToVehicleStatus";
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
    { state: "any", text: "Cualquier" },
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

  // Status options = only the statuses currently present in the loaded
  // products (translated via `mapProductStatusToVehicleStatus`), ordered
  // by the caller's `statusOrder` so the dropdown reads consistently with
  // the rest of the catalog UI. Inline computation — React Compiler
  // handles memoization (project PR #24 convention).
  const presentStatuses = new Set(
    products.map((p) => mapProductStatusToVehicleStatus(p.status)),
  );
  const availableStatuses = statusOrder.filter((s) => presentStatuses.has(s));

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
          className="bg-transparent text-[13px] text-ps-text-primary outline-none cursor-pointer"
        >
          <option value="">Cualquier</option>
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <TriStateToggle
        label="Publicado en Marketplace"
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
