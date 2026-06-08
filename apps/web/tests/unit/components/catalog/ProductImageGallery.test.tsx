/**
 * Unit tests for `ProductImageGallery` — the UI consumer of `getProductImages`.
 *
 * Regression: when `getProductImages` returns entries with `url: null` (the
 * signed URL was missing for a key), the gallery used to pass `null` to
 * `<Image>` and crash. The gallery must filter out null-URL entries and
 * show the empty state if every entry is filtered out.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductImageGallery } from '@/components/catalog/ProductImageGallery'
import type { ProductImage } from '@/types/product-image'

// Stub next/image so we don't need to mock the full image optimizer pipeline.
// We forward `unoptimized` as a data attribute so tests can assert that
// the gallery passes `unoptimized={true}` to <Image> when rendering signed
// URLs — this is the regression guard for the `_next/image 400` issue
// (see the regression note below in the new test block).
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    unoptimized,
  }: {
    src: string
    alt: string
    unoptimized?: boolean
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="next-image"
      src={src}
      alt={alt}
      data-unoptimized={unoptimized ? 'true' : 'false'}
    />
  ),
}))

function makeImage(overrides: Partial<ProductImage> = {}): ProductImage {
  return {
    id: 'img-1',
    product_id: 'prod-1',
    url: 'http://localhost:9000/prosell-assets/orgs/tenant/vehicles/abc.jpg',
    thumbnail_url: null,
    sort_order: 0,
    is_primary: true,
    alt_text: 'Test',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('ProductImageGallery — null URL handling', () => {
  it('shows the empty state when given an empty array', () => {
    render(<ProductImageGallery images={[]} />)

    expect(screen.getByTestId('image-gallery')).toBeInTheDocument()
    expect(screen.getByText(/Sin imágenes disponibles/i)).toBeInTheDocument()
  })

  it('shows the empty state when ALL images have url=null', () => {
    // This is the post-fix path: getProductImages returns null for keys
    // without a signed URL, and the gallery must treat the whole list as
    // "no renderable images" rather than try to render an entry with a null src.
    const allNull = [
      makeImage({ id: 'a', url: null as unknown as string }),
      makeImage({ id: 'b', url: null as unknown as string }),
    ]

    render(<ProductImageGallery images={allNull} />)

    expect(screen.getByText(/Sin imágenes disponibles/i)).toBeInTheDocument()
    // No <img> should be rendered
    expect(screen.queryAllByTestId('next-image')).toHaveLength(0)
  })

  it('renders only the images with non-null URLs (mixed list)', () => {
    const images: ProductImage[] = [
      makeImage({ id: 'a', url: 'http://localhost:9000/a.jpg', sort_order: 0 }),
      makeImage({ id: 'b', url: null as unknown as string, sort_order: 1 }),
      makeImage({ id: 'c', url: 'http://localhost:9000/c.jpg', sort_order: 2 }),
    ]

    render(<ProductImageGallery images={images} />)

    const imgs = screen.queryAllByTestId('next-image')
    // 1 main image + 2 thumbnails (we have 2 renderable images)
    expect(imgs).toHaveLength(3)
    // None of the rendered <img>s has a null src
    for (const img of imgs) {
      expect(img.getAttribute('src')).not.toBeNull()
      expect(img.getAttribute('src')).not.toContain('null')
    }
  })

  it('renders normally when all images have valid URLs', () => {
    const images: ProductImage[] = [
      makeImage({ id: 'a', url: 'http://localhost:9000/a.jpg' }),
      makeImage({ id: 'b', url: 'http://localhost:9000/b.jpg' }),
    ]

    render(<ProductImageGallery images={images} />)

    // No empty state
    expect(screen.queryByText(/Sin imágenes disponibles/i)).not.toBeInTheDocument()
    // 1 main + 2 thumbnails
    expect(screen.queryAllByTestId('next-image')).toHaveLength(3)
  })

  // ── Regression: `/_next/image 400` on MinIO signed URLs ────────────────────
  // The gallery renders URLs that come from the backend's `/image-urls`
  // endpoint — they are MinIO presigned URLs, host-bound to
  // `S3_PUBLIC_ENDPOINT_URL` (e.g. `http://localhost:9000`). The Next.js
  // Image Optimization proxy runs server-side, inside the Docker `web`
  // container, where `localhost:9000` does NOT resolve to MinIO — so the
  // proxy 400s on every image. The fix is to pass `unoptimized={true}` to
  // `<Image>`: the browser fetches the signed URL directly and the proxy
  // is never involved. Both the main image and every thumbnail must opt
  // out. This block guards that — if a future change drops the prop from
  // either spot, the `_next/image 400` comes back.
  describe('unoptimized prop on signed URLs (catalog image regression)', () => {
    const SIGNED_URL = 'http://localhost:9000/prosell-assets/orgs/abc/vehicles/abc.jpg'

    it('passes unoptimized={true} to the main <Image>', () => {
      render(<ProductImageGallery images={[makeImage({ url: SIGNED_URL })]} />)

      const imgs = screen.queryAllByTestId('next-image')
      // Only one image → only the main <Image>, no thumbnails
      expect(imgs).toHaveLength(1)
      expect(imgs[0].getAttribute('data-unoptimized')).toBe('true')
    })

    it('passes unoptimized={true} to every thumbnail <Image>', () => {
      // 3 renderable images → 1 main + 3 thumbnails = 4 <Image> instances
      const images: ProductImage[] = [
        makeImage({ id: 'a', url: SIGNED_URL, sort_order: 0 }),
        makeImage({ id: 'b', url: SIGNED_URL + '?shot=2', sort_order: 1 }),
        makeImage({ id: 'c', url: SIGNED_URL + '?shot=3', sort_order: 2 }),
      ]

      render(<ProductImageGallery images={images} />)

      const imgs = screen.queryAllByTestId('next-image')
      expect(imgs).toHaveLength(4)
      for (const img of imgs) {
        expect(img.getAttribute('data-unoptimized')).toBe('true')
      }
    })
  })
})
