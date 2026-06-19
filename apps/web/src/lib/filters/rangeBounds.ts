/**
 * Resolve Slider bounds for a `range` filter field from its schema entry.
 *
 * Spec §Frontend (line 132): "Slider bounds from `validation_rules`
 * min/max when present, else data range fallback". The data-range fallback
 * is handled by the catalog container (which can hit the backend for
 * min/max aggregates); the sidebar only owns the schema-driven half:
 * if `validation_rules` declares bounds, those win. Otherwise we fall
 * back to safe defaults that won't visually clip the slider before the
 * user starts dragging.
 *
 * Returns the *display* bounds (what the Slider renders) plus the
 * current value derived from URL state — already clamped so the thumb
 * stays inside the bounds even when the URL carries a stale value.
 */

import type { AttributeSchemaEntry } from "@/types/category";

/** Bounds that keep the Slider usable when the schema doesn't declare any. */
const DEFAULT_RANGE_MIN = 0;
const DEFAULT_RANGE_MAX = 1000;

export interface ResolvedRange {
  /** Lower bound displayed on the Slider track. */
  min: number;
  /** Upper bound displayed on the Slider track. */
  max: number;
  /** Current value ([lo, hi]), clamped to [min, max]. */
  value: [number, number];
}

export function resolveRangeBounds(
  entry: AttributeSchemaEntry | undefined,
  urlMin: string | undefined,
  urlMax: string | undefined,
): ResolvedRange {
  const vr = entry?.validation_rules;
  const min = vr?.min ?? DEFAULT_RANGE_MIN;
  const max = vr?.max ?? DEFAULT_RANGE_MAX;

  // Clamp URL values to the bounds so a stale URL like ?year_min=1800 on a
  // 1980-2026 schema doesn't push the thumb off the track.
  const rawLo = urlMin !== undefined && urlMin !== "" ? Number(urlMin) : min;
  const rawHi = urlMax !== undefined && urlMax !== "" ? Number(urlMax) : max;
  const lo = Number.isFinite(rawLo) ? Math.min(Math.max(rawLo, min), max) : min;
  const hi = Number.isFinite(rawHi) ? Math.min(Math.max(rawHi, min), max) : max;

  return { min, max, value: [lo, hi] };
}
