/**
 * Product image key resolution — single source of truth for the list
 * of image keys on a `Product`.
 *
 * The browser never sees the raw storage key. It calls the backend's
 * `/api/v1/products/{id}/image-urls` endpoint to get a signed download
 * URL. That endpoint merges two sources (in this exact order):
 *
 *   1. `product.image_urls` (top-level column — post-migration location)
 *   2. `product.attributes.image_urls` (legacy location)
 *
 * Anything that lives in either of these two locations is a valid input
 * to the signer. This helper mirrors that merge so any UI code that
 * needs to "pick a key to sign" (the catalog card cover, the DataGrid
 * thumbnail, etc.) gets a result that's guaranteed to be signable.
 *
 * ---
 *
 * Regression context (catalog-image-perf, 2026-06):
 *   The catalog card and `transformProductToVehicle` both picked the
 *   cover image with a short-circuit like:
 *
 *       Array.isArray(product.image_urls)
 *         ? product.image_urls
 *         : (Array.isArray(attrs?.image_urls) ? attrs.image_urls : [])
 *
 *   The short-circuit matched when `product.image_urls` was `[]` (an
 *   empty array, NOT `undefined`). The empty array was kept and the
 *   fallback to `attrs.image_urls` never fired. Result: the card
 *   rendered the placeholder image even when the product had real
 *   images persisted in the legacy `attrs.image_urls` location (the
 *   form at `apps/web/src/app/(seller)/catalog/create/page.tsx` writes
 *   images there, so every newly-created product hit the bug).
 *
 *   The detail view did not have this bug because it uses
 *   `getStringArray()` (which returns `[]` for empty arrays and
 *   falls through to the attribute-level source). This helper is the
 *   shared, single-source-of-truth replacement.
 *
 * ---
 *
 * Order of keys:
 *   - Top-level entries first, in the order they appear.
 *   - Attribute-level entries appended, deduped against what was
 *     already in the top-level list.
 *   - Empty strings and non-string entries are dropped.
 *
 *   This is order-preserving for both sources, which is the contract
 *   the user expects: the first image the seller uploaded is the
 *   cover, and reordering on read would silently change the cover.
 */

import type { Product } from "@/types/product";

/**
 * Filter an arbitrary `unknown` to the list of non-empty strings it
 * contains, or `[]` if the input isn't array-shaped.
 *
 * Mixed-type arrays (e.g. legacy data with a stray object entry) are
 * handled defensively: the valid strings are kept, the bad entries
 * are dropped. We don't reject the whole list, because that would
 * hide data corruption from the user — the seller uploaded real
 * images and they should still render.
 */
function filterStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
}

/**
 * Returns the list of image keys (or signed URLs) for a product, in
 * display order, deduped, with empty/non-string entries removed.
 *
 * Safe to call with a partially-populated `Product` (e.g. fixtures
 * that only define the fields relevant to a test).
 */
export function getProductImageKeys(
  product: Product | null | undefined,
): string[] {
  if (!product || typeof product !== "object") return [];

  const productLevel = filterStrings(product.image_urls);

  const attrs = product.attributes;
  const attributeLevel =
    attrs && typeof attrs === "object" && !Array.isArray(attrs)
      ? filterStrings((attrs as Record<string, unknown>).image_urls)
      : [];

  // Deduped, order-preserving merge. Top-level wins (it's the
  // post-migration canonical location). The backend endpoint does
  // the exact same merge — see `product_router.py`:
  // `get_product_image_urls`.
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const key of [...productLevel, ...attributeLevel]) {
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(key);
  }
  return merged;
}

/**
 * Returns the storage key of the product's cover image, with
 * explicit priority:
 *
 *   1. `product.cover_image_key` if it is set AND it is present in
 *      the image list (the user explicitly picked it).
 *   2. The first entry of the merged image list (legacy / no-cover
 *      fallback).
 *   3. `undefined` if the product has no images.
 *
 * Single source of truth for "which image is the cover" across the
 * catalog grid card, the detail-view hero, the CommandPalette
 * thumbnail, and the vehicle transformer. Before this helper each
 * of those took `image_urls[0]` independently — a position-based
 * convention that the user could not influence.
 *
 * Defensive: case (1) requires the cover key to actually be in the
 * image list. A stale `cover_image_key` (one that points to a
 * removed image) falls through to (2). The backend already drops
 * the cover on `image_urls: []` (see the router), but a defensive
 * fallback here protects against partial writes / pre-migration
 * data / direct DB tampering.
 *
 * Safe to call with `null` or `undefined` — returns `undefined`,
 * which every renderer treats as "show the placeholder image".
 */
export function getCoverImageKey(
  product: Product | null | undefined,
): string | undefined {
  if (!product || typeof product !== "object") return undefined;

  const images = getProductImageKeys(product);
  const cover = product.cover_image_key;
  if (typeof cover === "string" && cover.length > 0 && images.includes(cover)) {
    return cover;
  }
  return images[0];
}
