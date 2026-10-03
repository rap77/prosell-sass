/**
 * Non-component logic shared by the catalog's quick filters — split out of
 * QuickFilters.tsx (react-doctor `only-export-components`: a file mixing
 * component and non-component exports defeats Fast Refresh). Components
 * stay in QuickFilters.tsx; everything else lives here.
 */

"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types/product";
import type { VehicleStatus } from "@/components/datagrid/StatusBadge";
import { mapProductStatusToVehicleStatus } from "@/lib/utils/mapProductStatusToVehicleStatus";

export const STATUS_LABELS: Record<VehicleStatus, string> = {
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

export const TRI_STATE = {
  any: "any",
  true: "true",
  false: "false",
} as const;

export type TriState = (typeof TRI_STATE)[keyof typeof TRI_STATE];

export function parseTriState(raw: string | null): TriState {
  if (raw === "true") return "true";
  if (raw === "false") return "false";
  return "any";
}

/**
 * Captures the *applied* statuses (the subset present in the user's
 * catalog) on the FIRST render where products are loaded and no status
 * filter is active. Once captured, the list is frozen — picking a status
 * doesn't shrink the dropdown to just that status + "Todos", so the seller
 * can switch between applied statuses freely. Shared by QuickFilters
 * (desktop) and CatalogFilterPanel so both show the same option set.
 */
export function useAppliedStatuses(
  products: Product[],
  statusOrder: readonly VehicleStatus[],
  statusFilterActive: boolean,
): VehicleStatus[] {
  const [appliedStatuses, setAppliedStatuses] = useState<
    VehicleStatus[] | null
  >(null);
  useEffect(() => {
    if (
      appliedStatuses !== null ||
      statusFilterActive ||
      products.length === 0
    ) {
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
  }, [appliedStatuses, products, statusOrder, statusFilterActive]);

  // First-render fallback (before products load, or while a status filter
  // is in the URL): show the full status order. After capture, return the
  // frozen "applied" subset.
  return appliedStatuses ?? [...statusOrder];
}
