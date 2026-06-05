/**
 * Unit tests for `getProductImages` — the helper that maps a `Product` +
 * signed-URL map into a `ProductImage[]` for the gallery.
 *
 * Regression: when the signed-URL map is missing a key (no match), the
 * helper used to fall back to the RAW internal-endpoint URL
 * (e.g. `http://minio:9000/...`). The browser can't fetch that (the
 * hostname isn't in `next.config.ts`'s image allowlist) and silently fails.
 * The helper must return `null` in that case so the gallery shows its
 * empty state instead of feeding an unreachable URL to `<Image>`.
 */

import { describe, it, expect } from 'vitest'
import { getProductImages } from '@/components/catalog/CatalogDetailView'
import type { Product } from '@/types/product'

const RAW_URL =
  'http://minio:9000/prosell-assets/orgs/11111111-1111-1111-1111-111111111111/vehicles/abc.jpg'
const SIGNED_URL =
  'http://localhost:9000/prosell-assets/orgs/11111111-1111-1111-1111-111111111111/vehicles/abc.jpg' +
  '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=deadbeef'

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    organization_id: 'org-1',
    category_id: 'cat-1',
    title: 'Test Vehicle',
    price_cents: 1000000,
    currency: 'USD',
    condition: 'used',
    status: 'published',
    attributes: {},
    image_urls: [],
    is_featured: false,
    view_count: 0,
    favorite_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('getProductImages — signed URL resolution', () => {
  describe('when image_urls come from product.attributes.image_urls (legacy fallback)', () => {
    it('returns the signed URL when the key matches the map', () => {
      const product = makeProduct({
        attributes: { image_urls: [RAW_URL] } as Product['attributes'],
      })
      const signedUrlMap = new Map<string, string>([[RAW_URL, SIGNED_URL]])

      const images = getProductImages(product, signedUrlMap)

      expect(images).toHaveLength(1)
      expect(images[0].url).toBe(SIGNED_URL)
      expect(images[0].thumbnail_url).toBe(SIGNED_URL)
    })

    it('returns null (NOT the raw URL) when no signed match is found', () => {
      // This is the bug: previously the helper echoed the raw internal-endpoint
      // URL back to the UI, and the browser couldn't fetch it.
      const product = makeProduct({
        attributes: { image_urls: [RAW_URL] } as Product['attributes'],
      })
      // Signed-URL map with a different key — no match for RAW_URL
      const signedUrlMap = new Map<string, string>([
        ['some_other_key', 'http://localhost:9000/some_other_signed.jpg'],
      ])

      const images = getProductImages(product, signedUrlMap)

      expect(images).toHaveLength(1)
      expect(images[0].url).toBeNull()
      expect(images[0].thumbnail_url).toBeNull()
      // The raw URL MUST NOT leak to the gallery (browser would try to load it
      // and fail with hostname not in next.config.ts allowlist). Serialized
      // output MUST NOT contain the raw URL.
      expect(JSON.stringify(images)).not.toContain('minio:9000')
    })

    it('returns null for every image when the map is empty', () => {
      const product = makeProduct({
        attributes: { image_urls: [RAW_URL, RAW_URL + '2'] } as Product['attributes'],
      })

      const images = getProductImages(product, new Map())

      expect(images).toHaveLength(2)
      for (const img of images) {
        expect(img.url).toBeNull()
        expect(img.thumbnail_url).toBeNull()
      }
      // And no raw URL leaks through the JSON serialization
      expect(JSON.stringify(images)).not.toContain('minio:9000')
    })
  })

  describe('when image_urls come from product.image_urls (top-level)', () => {
    it('returns the signed URL when the key matches the map', () => {
      const product = makeProduct({ image_urls: [RAW_URL] })
      const signedUrlMap = new Map<string, string>([[RAW_URL, SIGNED_URL]])

      const images = getProductImages(product, signedUrlMap)

      expect(images).toHaveLength(1)
      expect(images[0].url).toBe(SIGNED_URL)
    })

    it('returns null (NOT the raw URL) when no signed match is found', () => {
      const product = makeProduct({ image_urls: [RAW_URL] })

      const images = getProductImages(product, new Map())

      expect(images).toHaveLength(1)
      expect(images[0].url).toBeNull()
      expect(images[0].thumbnail_url).toBeNull()
      expect(JSON.stringify(images)).not.toContain('minio:9000')
    })
  })

  describe('when image_urls come from product.attributes.images (structured array)', () => {
    it('returns the signed URL when the key matches the map', () => {
      const product = makeProduct({
        attributes: {
          images: [{ url: RAW_URL, sort_order: 0, is_primary: true }],
        } as unknown as Product['attributes'],
      })
      const signedUrlMap = new Map<string, string>([[RAW_URL, SIGNED_URL]])

      const images = getProductImages(product, signedUrlMap)

      expect(images).toHaveLength(1)
      expect(images[0].url).toBe(SIGNED_URL)
    })

    it('returns null (NOT the raw URL) when no signed match is found', () => {
      const product = makeProduct({
        attributes: {
          images: [{ url: RAW_URL, sort_order: 0, is_primary: true }],
        } as unknown as Product['attributes'],
      })

      const images = getProductImages(product, new Map())

      expect(images).toHaveLength(1)
      expect(images[0].url).toBeNull()
      expect(JSON.stringify(images)).not.toContain('minio:9000')
    })
  })

  describe('security boundary — no raw URL must ever leak', () => {
    it('the result never contains a raw internal-endpoint URL', () => {
      const product = makeProduct({
        image_urls: [RAW_URL],
        attributes: { image_urls: [RAW_URL] } as Product['attributes'],
      })

      const images = getProductImages(product, new Map())

      // Serialize the full result and assert: no occurrence of the raw host
      const serialized = JSON.stringify(images)
      expect(serialized).not.toContain('minio:9000')
      expect(serialized).not.toContain(RAW_URL)
    })
  })
})
