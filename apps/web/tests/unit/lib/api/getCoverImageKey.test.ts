/**
 * Unit tests for `getCoverImageKey` — the helper that picks which
 * image key is the cover for a product.
 *
 * Why this exists (single source of truth):
 *   The catalog grid card, the detail-view hero, the CommandPalette
 *   thumbnail, and the `transformProductToVehicle` helper all need
 *   to render the same "cover image" for a product. Before this
 *   helper, each of them took `image_urls[0]` and called it a day —
 *   a position-based convention that broke the moment the seller
 *   picked a different image as cover.
 *
 *   With `cover_image_key` as a first-class field on the product
 *   (backend) and `cover_image_key` on the `Product` type
 *   (frontend), the helper is the ONE place that decides "which key
 *   is the cover", with explicit priority:
 *
 *     1. `cover_image_key` if set AND present in the image list.
 *     2. The first key of the merged image list (legacy fallback
 *        for products that have images but no cover set).
 *     3. `undefined` if there are no images at all.
 *
 *   Case (1) takes priority over (2) only when the cover key still
 *   references a real image — a stale `cover_image_key` that points
 *   to a removed image falls through to (2). The backend's clear-
 *   images path already drops a stale cover (see the
 *   UpdateProductRequest validator), but a defensive fallback here
 *   costs nothing and protects against partial data.
 */

import { describe, it, expect } from 'vitest'
import { getCoverImageKey } from '@/lib/api/productImages'
import type { Product } from '@/types/product'

const KEY_A = 'orgs/tenant-1/vehicles/a.jpg'
const KEY_B = 'orgs/tenant-1/vehicles/b.jpg'
const KEY_C = 'orgs/tenant-1/vehicles/c.jpg'
const STALE_KEY = 'orgs/tenant-1/vehicles/deleted.jpg' // not in image_urls

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    tenant_id: 'tenant-1',
    organization_id: 'org-1',
    category_id: 'cat-1',
    title: 'Test Vehicle',
    price_cents: 1000000,
    currency: 'USD',
    condition: 'used',
    status: 'published',
    attributes: {} as unknown as Product['attributes'],
    image_urls: [],
    cover_image_key: null,
    is_featured: false,
    view_count: 0,
    favorite_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('getCoverImageKey', () => {
  describe('cover_image_key set + in image list', () => {
    it('returns the cover key, even when it is not the first image', () => {
      // The user picked B as cover; the gallery order says A is
      // first. The cover wins, because that is what the user
      // explicitly chose.
      const product = makeProduct({
        image_urls: [KEY_A, KEY_B, KEY_C],
        cover_image_key: KEY_B,
      })
      expect(getCoverImageKey(product)).toBe(KEY_B)
    })

    it('returns the cover key when it IS the first image (idempotent)', () => {
      // Common case after a fresh upload: cover = first image.
      // The helper still returns the cover key — semantically
      // equivalent to "first image", but routed through the same
      // explicit field for consistency.
      const product = makeProduct({
        image_urls: [KEY_A, KEY_B],
        cover_image_key: KEY_A,
      })
      expect(getCoverImageKey(product)).toBe(KEY_A)
    })
  })

  describe('cover_image_key NOT set (fallback to position)', () => {
    it('returns the first image when no cover is set', () => {
      // Legacy / pre-migration path: the product has images but no
      // explicit cover. The first image is the de-facto cover.
      const product = makeProduct({
        image_urls: [KEY_A, KEY_B, KEY_C],
        cover_image_key: null,
      })
      expect(getCoverImageKey(product)).toBe(KEY_A)
    })

    it('returns the first image from the legacy attribute-level list', () => {
      // The `getProductImageKeys` helper already merges top-level
      // and attribute-level sources (deduped, order-preserving).
      // When the top-level list is empty, the attribute list is
      // the source of truth.
      const product = makeProduct({
        image_urls: [],
        cover_image_key: null,
        attributes: { image_urls: [KEY_B, KEY_C] } as unknown as Product['attributes'],
      })
      expect(getCoverImageKey(product)).toBe(KEY_B)
    })
  })

  describe('stale cover_image_key (defensive)', () => {
    it('falls back to the first image when the cover key is not in the image list', () => {
      // The cover points to a key that no longer exists in the
      // image list. This should be impossible after a proper
      // backend clear (the clear-images path drops the cover), but
      // a defensive fallback here protects against:
      //   - partial DB writes
      //   - the create-form's pre-migration attribute path
      //   - direct DB tampering
      // The renderer must not return a URL pointing to a
      // non-existent image.
      const product = makeProduct({
        image_urls: [KEY_A, KEY_B],
        cover_image_key: STALE_KEY,
      })
      expect(getCoverImageKey(product)).toBe(KEY_A)
    })
  })

  describe('no images at all', () => {
    it('returns undefined when the product has no images and no cover', () => {
      // The empty case. The renderer treats `undefined` as "show
      // the placeholder image" — see VehicleCard, CommandPalette,
      // and the detail view.
      const product = makeProduct({
        image_urls: [],
        cover_image_key: null,
      })
      expect(getCoverImageKey(product)).toBeUndefined()
    })

    it('returns undefined when the product is null or missing', () => {
      // Defensive: never throw on a missing product. The renderers
      // pass `product` straight from the query; an early render
      // may have it as `undefined`.
      expect(getCoverImageKey(null)).toBeUndefined()
      expect(getCoverImageKey(undefined)).toBeUndefined()
    })
  })
})
