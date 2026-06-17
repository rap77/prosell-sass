/**
 * getApiStatus — narrows an arbitrary string to a VehicleStatus.
 *
 * Spec: T11 post-audit cleanup. The pre-fix implementation hand-rolled a
 * 7-string union into a `new Set<VehicleStatus>([...])` — adding a new
 * status to `VehicleStatus` would silently NOT include it in the set
 * (no typecheck error). The fix is `VALID_STATUS_MAP: Record<VehicleStatus, true>`,
 * which makes TypeScript FAIL the assignment the moment a new status is
 * added to the type without a corresponding entry. The set becomes
 * mechanical, not judgment.
 *
 * Tests:
 *   1. Each VehicleStatus literal passes through.
 *   2. Unknown strings return undefined.
 *   3. undefined input returns undefined.
 *   4. The map has exactly the 7 VehicleStatus keys (pins the type ↔ map
 *      correspondence; a future `as` cast that drops a key is caught).
 */

import { describe, it, expect } from "vitest";
import { getApiStatus, VALID_STATUS_MAP } from "@/lib/utils/getApiStatus";
import type { VehicleStatus } from "@/components/datagrid/StatusBadge";

const ALL_STATUSES: VehicleStatus[] = [
  "published",
  "pending",
  "failed",
  "draft",
  "expired",
  "online",
  "sold",
];

describe("getApiStatus", () => {
  it("returns the same value for every valid VehicleStatus", () => {
    for (const s of ALL_STATUSES) {
      expect(getApiStatus(s)).toBe(s);
    }
  });

  it("returns undefined for unknown strings", () => {
    expect(getApiStatus("archived")).toBeUndefined();
    expect(getApiStatus("PUBLISHED")).toBeUndefined(); // case-sensitive
    expect(getApiStatus("")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(getApiStatus(undefined)).toBeUndefined();
  });

  it("VALID_STATUS_MAP has exactly the 7 VehicleStatus keys", () => {
    // This pins the derive contract: if a new VehicleStatus is added to
    // the union, TypeScript will fail the `Record<VehicleStatus, true>`
    // annotation in the source file (compile-time). At runtime, this
    // test pins the count to 7 — if someone replaces the Record with a
    // hand-rolled set and forgets a key, this test catches it.
    const keys = Object.keys(VALID_STATUS_MAP).sort();
    expect(keys).toEqual([...ALL_STATUSES].sort());
  });
});
