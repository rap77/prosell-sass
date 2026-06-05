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

// Stub next/image so we don't need to mock the full image optimizer pipeline
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="next-image" src={src} alt={alt} />
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
})
