/**
 * mapProductStatusToVehicleStatus — Subsystem A (Generic ProductCard).
 *
 * Pins the runtime mapping from `Product.status` (8 domain literals) to
 * `VehicleStatus` (7 display literals that the `StatusBadge` understands).
 * The shape mismatch is by design: `Product.status` is the workflow state
 * the backend cares about; `VehicleStatus` is the visual vocabulary the
 * legacy `StatusBadge` ships with. Subsystem A introduced this util so the
 * generic card can pass `product.status` through the existing badge.
 *
 * Contract:
 *   - Total: every `Product.status` literal maps to a `VehicleStatus`.
 *     A missing entry must surface as a TypeScript error (the impl
 *     declares `satisfies Record<Product["status"], VehicleStatus>`).
 *   - Stable: existing `Product.status` literals whose value already
 *     exists in `VehicleStatus` (draft / pending / published / sold) are
 *     pass-through. The 4 workflow-only literals (paused / reserved /
 *     rejected / archived) collapse to the nearest existing display slot.
 *   - Safe: a malformed `Product.status` (defensive — should never happen
 *     but the type union is not sealed) is handled by the catch-all.
 */

import { describe, it, expect } from "vitest";
import { mapProductStatusToVehicleStatus } from "./mapProductStatusToVehicleStatus";

describe("mapProductStatusToVehicleStatus — pass-through", () => {
  it("maps `draft` to `draft`", () => {
    expect(mapProductStatusToVehicleStatus("draft")).toBe("draft");
  });

  it("maps `pending` to `pending`", () => {
    expect(mapProductStatusToVehicleStatus("pending")).toBe("pending");
  });

  it("maps `published` to `published`", () => {
    expect(mapProductStatusToVehicleStatus("published")).toBe("published");
  });

  it("maps `sold` to `sold`", () => {
    expect(mapProductStatusToVehicleStatus("sold")).toBe("sold");
  });
});

describe("mapProductStatusToVehicleStatus — workflow-only collapse", () => {
  it("maps `paused` to `draft` (paused is inactive, not visible)", () => {
    expect(mapProductStatusToVehicleStatus("paused")).toBe("draft");
  });

  it("maps `reserved` to `pending` (reserved is pending sale close)", () => {
    expect(mapProductStatusToVehicleStatus("reserved")).toBe("pending");
  });

  it("maps `rejected` to `failed` (rejection is approval failure)", () => {
    expect(mapProductStatusToVehicleStatus("rejected")).toBe("failed");
  });

  it("maps `archived` to `expired` (archived is no longer active)", () => {
    expect(mapProductStatusToVehicleStatus("archived")).toBe("expired");
  });
});

describe("mapProductStatusToVehicleStatus — safety", () => {
  it("returns `draft` as a safe default for an unknown string", () => {
    // Defensive: if the backend ever adds a new status that this util
    // hasn't been updated for, we render the card with a neutral badge
    // rather than crashing the grid.
    expect(mapProductStatusToVehicleStatus("pending_review_v2" as never)).toBe(
      "draft",
    );
  });
});
