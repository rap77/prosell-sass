/**
 * mapProductStatusToVehicleStatus — Subsystem A (Generic ProductCard).
 *
 * Bridges the two status shapes:
 *   - `Product.status` (8 domain literals) — what the backend workflow
 *     tracks. Includes the workflow-only literals `paused`, `rejected`,
 *     and `archived` that the catalog grid doesn't surface as separate
 *     display states.
 *   - `VehicleStatus` (9 display literals) — what the existing
 *     `StatusBadge` knows how to render (icon + label + colors).
 *
 * `reserved` is a pass-through (its own display slot, "Apartado") — it
 * used to collapse into `pending`, which made an apartado vehicle
 * indistinguishable from one still awaiting review.
 *
 * `paused` similarly has its own slot ("Mantenimiento" — seller hit
 * "En mantenimiento" from the AvailabilityActions menu) instead of
 * collapsing into `draft`. The two states have very different seller
 * intent (draft = still being edited; paused = deliberately taken
 * offline) and lumping them together made the catalog filter show
 * paused products under "Borrador" with no way to disambiguate.
 *
 * The remaining workflow-only literals still collapse to the nearest
 * existing display slot:
 *   rejected → failed  (approval workflow failure)
 *   archived → expired (no longer active)
 *
 * The `satisfies` annotation makes the mapping **exhaustive at compile
 * time** for `Product["status"]`: adding a new literal without updating
 * this map surfaces as a TypeScript error, not a runtime crash.
 *
 * The function accepts `string` so callers holding the narrower
 * `ProductStatus` (DataGrid row type) can pass through without
 * a structural-nominal mismatch. Unknown values fall through to
 * `draft` (the safe neutral default) so a misbehaving backend never
 * blows up the catalog grid.
 *
 * Spec: docs/superpowers/specs/2026-06-09-subsystem-a-productcard-design.md
 *       (deferred from T1 per the comment in src/types/category.test.ts).
 */
import type { VehicleStatus } from "@/components/datagrid/StatusBadge";
import type { Product } from "@/types/product";

const MAP = {
  draft: "draft",
  pending: "pending",
  published: "published",
  paused: "maintenance",
  reserved: "reserved",
  sold: "sold",
  rejected: "failed",
  archived: "expired",
} as const satisfies Record<Product["status"], VehicleStatus>;

/**
 * Converts a catalog display status back to the status literal accepted by
 * `GET /products`. Display-only states must never reach the API directly.
 */
const VEHICLE_STATUS_TO_PRODUCT_STATUS = {
  published: "published",
  pending: "pending",
  failed: "rejected",
  draft: "draft",
  expired: "archived",
  online: "published",
  sold: "sold",
  reserved: "reserved",
  maintenance: "paused",
} as const satisfies Record<VehicleStatus, Product["status"]>;

export function mapProductStatusToVehicleStatus(status: string): VehicleStatus {
  if (status in MAP) return MAP[status as keyof typeof MAP];
  return "draft";
}

export function mapVehicleStatusToProductStatus(
  status: VehicleStatus,
): Product["status"] {
  return VEHICLE_STATUS_TO_PRODUCT_STATUS[status];
}
