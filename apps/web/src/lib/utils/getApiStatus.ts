/**
 * getApiStatus — narrows an arbitrary string (e.g. from URL search
 * params or external API input) to a `VehicleStatus`, returning
 * `undefined` for anything that isn't a known status.
 *
 * Spec: T11 post-audit cleanup. Replaces a hand-rolled `Set<VehicleStatus>`
 * with a `Record<VehicleStatus, true>` so that adding a new status to
 * the `VehicleStatus` union (in `StatusBadge.tsx`) trips a TypeScript
 * error on this file until the map is updated. The set becomes a
 * mechanical consequence of the type, not a separate judgment.
 *
 * Why a Record (not a tuple) for a membership check:
 *   - `Record<VehicleStatus, true>` requires EXHAUSTIVE coverage — the
 *     compile fails the moment a new variant is added without a
 *     matching entry. A `satisfies readonly VehicleStatus[]` tuple
 *     only catches wrong entries, not missing ones.
 *   - Membership check is `key in VALID_STATUS_MAP` (O(1), no array
 *     allocation).
 *
 * Behavior is identical to the previous implementation; this is a
 * compile-time safety refactor, not a runtime change.
 */

import type { VehicleStatus } from "@/components/datagrid/StatusBadge";

/**
 * Compile-time exhaustive map: every key of `VehicleStatus` must
 * appear here. TypeScript fails the assignment otherwise. Keep the
 * values as `true` (a membership marker — not a status descriptor).
 */
const VALID_STATUS_MAP = {
  published: true,
  pending: true,
  failed: true,
  draft: true,
  expired: true,
  online: true,
  sold: true,
} as const satisfies Record<VehicleStatus, true>;

/**
 * Re-export the map (read-only) for the test that pins the 7-key
 * correspondence between `VehicleStatus` and the membership check.
 * Internal callers should use `getApiStatus` — exporting the raw map
 * is a test seam, not an API.
 */
export { VALID_STATUS_MAP };

export function getApiStatus(s: string | undefined): VehicleStatus | undefined {
  if (!s) return undefined;
  return s in VALID_STATUS_MAP ? (s as VehicleStatus) : undefined;
}
