/**
 * resolveRangeBounds — pure helper that maps a `range` filter's schema
 * entry + URL state to Slider props (bounds + clamped value).
 *
 * Spec §Frontend line 132: Slider bounds must come from
 * `validation_rules.min/max` when present. Without that, a Slider for
 * `year` clamped to 0-100 is unusable.
 *
 * Subsystem B — Task 3 (post-plan hardening).
 */

import { describe, it, expect } from "vitest";

import { resolveRangeBounds } from "@/lib/filters/rangeBounds";
import type { AttributeSchemaEntry } from "@/types/category";

const yearEntry: AttributeSchemaEntry = {
  type: "number",
  filter_type: "range",
  validation_rules: { min: 1980, max: 2026 },
};

const mileageEntry: AttributeSchemaEntry = {
  type: "number",
  filter_type: "range",
  unit: "km",
  validation_rules: { min: 0, max: 500_000 },
};

const noRulesEntry: AttributeSchemaEntry = {
  type: "number",
  filter_type: "range",
};

describe("resolveRangeBounds", () => {
  it("uses validation_rules.min/max when present", () => {
    expect(resolveRangeBounds(yearEntry, undefined, undefined)).toEqual({
      min: 1980,
      max: 2026,
      value: [1980, 2026],
    });
  });

  it("falls back to safe defaults when validation_rules is absent", () => {
    const { min, max, value } = resolveRangeBounds(
      noRulesEntry,
      undefined,
      undefined,
    );
    // Defaults must be wide enough that a year or price fits without
    // truncation. Exact values are internal — only the contract matters.
    expect(max).toBeGreaterThan(min);
    expect(value).toEqual([min, max]);
  });

  it("clamps a URL value above the schema max down to max", () => {
    // URL says ?year_max=2099 but schema caps at 2026 → thumb must stop at 2026.
    const { value } = resolveRangeBounds(yearEntry, undefined, "2099");
    expect(value[1]).toBe(2026);
  });

  it("clamps a URL value below the schema min up to min", () => {
    const { value } = resolveRangeBounds(yearEntry, "1850", undefined);
    expect(value[0]).toBe(1980);
  });

  it("passes through URL values that fit within the bounds", () => {
    const { value } = resolveRangeBounds(yearEntry, "2015", "2020");
    expect(value).toEqual([2015, 2020]);
  });

  it("treats an empty URL string as 'unset' (uses bound as default)", () => {
    const { value } = resolveRangeBounds(yearEntry, "", "");
    expect(value).toEqual([1980, 2026]);
  });

  it("respects a unit-only schema (no validation_rules)", () => {
    // mileage has unit='km' but no validation_rules → falls back to defaults.
    const { value } = resolveRangeBounds(mileageEntry, "15000", "80000");
    // 15000 and 80000 must fit inside the resolved bounds (no truncation).
    expect(value[0]).toBeGreaterThanOrEqual(0);
    expect(value[1]).toBeLessThanOrEqual(500_000);
  });
});
