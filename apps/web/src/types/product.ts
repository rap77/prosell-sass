/**
 * Product types matching backend Pydantic models
 *
 * Matches: apps/api/src/prosell/application/dto/product/
 */

import type { ProductAttributes, VehicleAttributes } from "./vehicle";

/**
 * Product entity with status workflow
 *
 * Matches: apps/api/src/prosell/domain/entities/product.py
 */
export interface Product {
  id: string;
  tenant_id: string;
  organization_id: string;
  category_id: string;

  // Basic info
  title: string;
  slug?: string;
  description?: string;

  // Pricing (in cents)
  price_cents: number;
  currency: string; // default: "USD"

  // Condition and status
  condition: "new" | "used" | "refurbished";
  status:
    | "draft"
    | "pending"
    | "published"
    | "paused"
    | "reserved"
    | "sold"
    | "rejected"
    | "archived";

  // Flexible attributes (category-specific)
  attributes: ProductAttributes;

  // Image URLs at product level (moved from VehicleAttributes). The
  // ordered list — used for the gallery view.
  image_urls?: string[];
  // First-class pointer to the cover image. Single source of truth
  // for "which image is the cover" — settable independently from
  // upload order so the seller can pick any image as the cover.
  // Nullable: a product with no images has no cover. The renderer
  // falls back to `image_urls[0]` when this is null/undefined (see
  // `getCoverImageKey` in `lib/api/productImages.ts`).
  cover_image_key?: string | null;

  // Location
  location_city?: string;
  location_state?: string;
  location_zip?: string;

  // Visibility
  is_featured: boolean;
  published_to_marketplace?: boolean;
  view_count: number;
  favorite_count: number;

  // Approval workflow
  submitted_for_approval_at?: string;
  submitted_by?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;

  // Publication
  published_at?: string;
  sold_at?: string;
  archived_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Create product request
 *
 * Matches: apps/api/src/prosell/application/dto/product/create.py
 */
export interface CreateProductRequest {
  title: string;
  price_cents: number;
  // tenant_id / organization_id are injected by the backend from the
  // authenticated JWT context (see product_router.create_product) and
  // must NOT be sent from the client (IDOR prevention). Optional here
  // only so internal/test callers can set them; the prod flow omits them.
  tenant_id?: string;
  organization_id?: string;
  category_id: string;
  slug?: string;
  description?: string;
  currency?: string;
  condition?: "new" | "used" | "refurbished";
  attributes: ProductAttributes;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
  /**
   * Image storage KEYS (raw S3 paths, e.g. `orgs/{tenant}/vehicles/{uuid}.jpg`).
   * Do NOT pass signed URLs here — they expire in 1h and the image-urls
   * signer will produce malformed URLs. The image-urls endpoint re-signs
   * the keys on every read.
   */
  image_urls?: string[];
  /**
   * First-class pointer to the cover image (a storage KEY that must
   * also appear in `image_urls`). Null/omitted means "no cover" — the
   * renderer falls back to `image_urls[0]`. Backend enforces the
   * cross-field invariant (cover must be in image_urls).
   */
  cover_image_key?: string | null;
}

/**
 * Update product request
 */
export interface UpdateProductRequest {
  title?: string;
  description?: string;
  price_cents?: number;
  condition?: "new" | "used" | "refurbished";
  attributes?: ProductAttributes;
  location_city?: string;
  location_state?: string;
  location_zip?: string;
}

/**
 * Product list response
 */
export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Subsystem A (G1 follow-up): typed widening of the discriminated
 * `ProductAttributes` union into a flat `Record<string, unknown>` for
 * generic consumers (e.g. `ProductCard`, which reads attributes by
 * whatever `card_fields` the category's presentation contract declares).
 *
 * The widening is safe by construction: every variant of
 * `ProductAttributes` is a plain object with string/number/boolean
 * leaf values, so a runtime copy is faithful. This replaces the
 * previous `as Record<string, unknown>` cast at the call site (page.tsx),
 * which silently swallowed type errors and undermined the spec §3
 * "container is the source of truth" invariant.
 *
 * Keep this function in sync with the `ProductAttributes` discriminated
 * union (`apps/web/src/types/vehicle.ts`). If a new attribute variant
 * is added, this function MUST be updated — the test
 * `types/product.test.ts` pins the contract.
 */
export function getAttributeMap(
  attrs: ProductAttributes,
): Record<string, unknown> {
  // Object spread copies all enumerable own properties. Safe because:
  // (1) every ProductAttributes variant is a plain object,
  // (2) the leaf values are already JSON-serializable primitives,
  // (3) the discriminated union is the union source-of-truth.
  return { ...attrs };
}

/**
 * Product with vehicle data extracted from attributes
 * Convenience type for vehicle-specific views
 */
export interface ProductWithVehicle extends Product {
  attributes: VehicleAttributes;
}

/**
 * Type guard to check if product is a vehicle
 */
export function isVehicleProduct(
  product: Product,
): product is ProductWithVehicle {
  return product.attributes.category === "vehicle";
}

// Re-export ProductAttributes for convenience
export type { ProductAttributes, VehicleAttributes } from "./vehicle";
