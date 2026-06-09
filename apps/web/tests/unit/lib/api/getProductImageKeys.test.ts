/**
 * Unit tests for `getProductImageKeys` — the single source of truth for
 * the list of image keys on a Product.
 *
 * Why this exists (regression):
 *   The catalog card (VehicleCard) and `transformProductToVehicle` both
 *   pick the cover image by taking `imageUrls[0]`. They used to derive
 *   `imageUrls` from a short-circuit like:
 *
 *       Array.isArray(product.image_urls)
 *         ? product.image_urls
 *         : (Array.isArray(attrs?.image_urls) ? attrs.image_urls : [])
 *
 *   That broke when the backend returned `product.image_urls = []` (an
 *   empty array, NOT `undefined`). The condition matched, the empty
 *   array was kept, and the fallback to `attrs.image_urls` never fired.
 *   Result: the card showed the placeholder even when the product had
 *   images stored in `attrs.image_urls` (the legacy location used by
 *   the create form).
 *
 *   The fix: a shared helper that uses `getStringArray`-style filtering
 *   and merges both sources, deduped and order-preserving. The same
 *   merge logic runs in the backend's `/image-urls` endpoint, so what
 *   the helper returns is guaranteed to be signable.
 */

import { describe, it, expect } from "vitest";
import { getProductImageKeys } from "@/lib/api/productImages";
import type { Product } from "@/types/product";

const KEY_A = "orgs/tenant-1/vehicles/a.jpg";
const KEY_B = "orgs/tenant-1/vehicles/b.jpg";
const KEY_C = "orgs/tenant-1/vehicles/c.jpg";

function makeProduct(overrides: Partial<Product> = {}): Product {
  // The test fixtures use partial `attributes` objects — `ProductAttributes`
  // is a discriminated union requiring category-specific fields. The helper
  // under test only reads `image_urls` from attributes and does not branch
  // on `category`, so we cast through `unknown`.
  return {
    id: "prod-1",
    tenant_id: "tenant-1",
    organization_id: "org-1",
    category_id: "cat-1",
    title: "Test Vehicle",
    price_cents: 1000000,
    currency: "USD",
    condition: "used",
    status: "published",
    attributes: {} as unknown as Product["attributes"],
    image_urls: [],
    is_featured: false,
    view_count: 0,
    favorite_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getProductImageKeys", () => {
  describe("top-level only (post-migration location)", () => {
    it("returns the top-level keys in order", () => {
      const product = makeProduct({ image_urls: [KEY_A, KEY_B, KEY_C] });
      expect(getProductImageKeys(product)).toEqual([KEY_A, KEY_B, KEY_C]);
    });

    it("returns a single key as a one-element array", () => {
      const product = makeProduct({ image_urls: [KEY_A] });
      expect(getProductImageKeys(product)).toEqual([KEY_A]);
    });
  });

  describe("legacy location only (pre-migration / create form persists there)", () => {
    it("returns the attribute-level keys when top-level is undefined", () => {
      const product = makeProduct({
        image_urls: undefined,
        attributes: {
          image_urls: [KEY_A, KEY_B],
        } as unknown as Product["attributes"],
      });
      expect(getProductImageKeys(product)).toEqual([KEY_A, KEY_B]);
    });

    // The actual bug: top-level is an EMPTY ARRAY (not undefined) and the
    // attribute-level has the real keys. Before the fix, the short-circuit
    // kept the empty array and the fallback never fired, so the card showed
    // the placeholder. This test guards the regression.
    it("falls back to attribute-level when top-level is an EMPTY ARRAY (the regression)", () => {
      const product = makeProduct({
        image_urls: [],
        attributes: {
          image_urls: [KEY_A, KEY_B, KEY_C],
        } as unknown as Product["attributes"],
      });
      expect(getProductImageKeys(product)).toEqual([KEY_A, KEY_B, KEY_C]);
    });

    it("falls back to attribute-level when top-level is null", () => {
      // Some legacy rows may have a literal `null` for image_urls
      // (a bug in the old create form that concatenated undefined into
      // the JSON payload). Treat null like undefined.
      const product = makeProduct({
        image_urls: null as unknown as string[],
        attributes: { image_urls: [KEY_A] } as unknown as Product["attributes"],
      });
      expect(getProductImageKeys(product)).toEqual([KEY_A]);
    });
  });

  describe("merge: both locations populated", () => {
    it("prefers top-level order, appends deduped attribute-level entries", () => {
      const product = makeProduct({
        image_urls: [KEY_A, KEY_B],
        attributes: {
          image_urls: [KEY_B, KEY_C],
        } as unknown as Product["attributes"],
      });
      // Top-level first (KEY_A, KEY_B), then KEY_C (from attrs, not yet seen)
      expect(getProductImageKeys(product)).toEqual([KEY_A, KEY_B, KEY_C]);
    });

    it("does not duplicate when the same key is in both locations", () => {
      const product = makeProduct({
        image_urls: [KEY_A, KEY_B],
        attributes: {
          image_urls: [KEY_A, KEY_B],
        } as unknown as Product["attributes"],
      });
      expect(getProductImageKeys(product)).toEqual([KEY_A, KEY_B]);
    });
  });

  describe("empty / missing product", () => {
    it("returns [] when both sources are empty arrays", () => {
      const product = makeProduct({
        image_urls: [],
        attributes: { image_urls: [] } as unknown as Product["attributes"],
      });
      expect(getProductImageKeys(product)).toEqual([]);
    });

    it("returns [] when both sources are missing", () => {
      const product = makeProduct({
        image_urls: undefined,
        attributes: {} as unknown as Product["attributes"],
      });
      expect(getProductImageKeys(product)).toEqual([]);
    });

    it("returns [] when attributes is null/undefined", () => {
      const product = makeProduct({
        image_urls: [KEY_A],
        attributes: null as unknown as Product["attributes"],
      });
      expect(getProductImageKeys(product)).toEqual([KEY_A]);
    });
  });

  describe("defensive filtering", () => {
    it("drops empty strings from either source", () => {
      const product = makeProduct({
        image_urls: ["", KEY_A, ""],
        attributes: {
          image_urls: ["", KEY_B],
        } as unknown as Product["attributes"],
      });
      expect(getProductImageKeys(product)).toEqual([KEY_A, KEY_B]);
    });

    it("drops non-string entries (e.g. accidental objects in legacy JSON)", () => {
      const product = makeProduct({
        image_urls: [KEY_A, { url: "http://x" } as unknown as string, KEY_B],
      });
      expect(getProductImageKeys(product)).toEqual([KEY_A, KEY_B]);
    });
  });
});
