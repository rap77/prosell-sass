/**
 * mapProductStatusToVehicleStatus — Subsystem A (Generic ProductCard).
 *
 * Bridges the two status shapes:
 *   - `Product.status` (8 domain literals) — what the backend workflow
 *     tracks. Includes the workflow-only literals `paused`, `reserved`,
 *     `rejected`, and `archived` that the catalog grid doesn't surface
 *     as separate display states.
 *   - `VehicleStatus` (7 display literals) — what the existing
 *     `StatusBadge` knows how to render (icon + label + colors).
 *
 * The four workflow-only literals collapse to the nearest existing
 * display slot:
 *   paused   → draft   (inactive, not visible to buyers)
 *   reserved → pending (waiting for sale close)
 *   rejected → failed  (approval workflow failure)
 *   archived → expired (no longer active)
 *
 * The `satisfies` annotation makes the mapping **exhaustive at compile
 * time**: adding a new `Product.status` literal without updating this
 * map surfaces as a TypeScript error, not a runtime crash.
 *
 * Unknown values fall through to `draft` (the safe neutral default) so
 * a misbehaving backend never blows up the catalog grid.
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
  paused: "draft",
  reserved: "pending",
  sold: "sold",
  rejected: "failed",
  archived: "expired",
} as const satisfies Record<Product["status"], VehicleStatus>;

export function mapProductStatusToVehicleStatus(
  status: Product["status"],
): VehicleStatus {
  return MAP[status] ?? "draft";
}
