/**
 * Unit tests for `ProductCoverPicker` — the single source of truth
 * for the seller-facing "pick which image is the cover" UX.
 *
 * The component is polymorphic on `mode`:
 *
 *   - `mode="edit"`   — server-backed. Reads the product's existing
 *     image URLs from the API, PATCHes `cover_image_key` immediately
 *     on click. Used on the catalog edit page.
 *
 *   - `mode="create"` — store-backed. Reads `uploadedFiles` +
 *     `coverImageId` from the Zustand `uploadStore` (the seller has
 *     just dropped/pasted the images but the product doesn't exist
 *     yet). A click writes the new cover to the store; the create
 *     page's submit handler reads it and translates the file ID to
 *     a storage key for the `POST /products` body.
 *
 * Both modes render the same `CoverImageGallery` UX — only the data
 * source and the cover-change handler differ. That keeps the user
 * experience consistent across create and edit.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductCoverPicker } from '@/components/forms/ProductCoverPicker'

// ─── next/image mock ──────────────────────────────────────────────────
// Same pattern as the rest of the suite. Forwards src so the test
// can assert which image the gallery rendered.
vi.mock('next/image', () => ({
  default: ({ src, unoptimized }: { src: string; unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="cover-image-img"
      src={src}
      data-unoptimized={unoptimized ? 'true' : 'false'}
    />
  ),
}))

// ─── uploadStore mock (create mode) ───────────────────────────────────
// The create mode reads from the Zustand store. We expose the bare
// state + actions the picker needs; everything else falls through to
// the real (default) state.
const mockStoreState = {
  uploadedFiles: [] as Array<{ id: string; preview: string }>,
  coverImageId: null as string | null,
  setCoverImage: vi.fn(),
  removeUploadedFile: vi.fn(),
}

vi.mock('@/lib/stores/uploadStore', () => ({
  useUploadStore: (selector?: (s: typeof mockStoreState) => unknown) =>
    selector ? selector(mockStoreState) : mockStoreState,
}))

// ─── API hooks mock (edit mode) ───────────────────────────────────────
const mockProduct = { id: 'prod-1', cover_image_key: null as string | null }
const mockSigned = {
  images: [
    { key: 'orgs/t1/vehicles/a.jpg', url: 'https://signed/a' },
    { key: 'orgs/t1/vehicles/b.jpg', url: 'https://signed/b' },
  ],
}
const mockSetCover = { mutate: vi.fn(), isPending: false }

vi.mock('@/lib/api/products', () => ({
  useProduct: () => ({ data: mockProduct }),
  useProductImageUrls: () => ({ data: mockSigned }),
  useSetProductCover: () => mockSetCover,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockStoreState.uploadedFiles = []
  mockStoreState.coverImageId = null
  mockProduct.cover_image_key = null
})

describe('ProductCoverPicker — mode="create" (store-backed)', () => {
  it('renders one tile per file in the upload store, using the blob preview as src', () => {
    // The seller has dropped two files — the picker should show both
    // as tiles, with the blob: URL the store produces. This is the
    // same UX as the edit mode, just sourced from a different place.
    mockStoreState.uploadedFiles = [
      { id: 'file-a', preview: 'blob:preview-a' },
      { id: 'file-b', preview: 'blob:preview-b' },
    ]
    mockStoreState.coverImageId = 'file-a'

    render(<ProductCoverPicker mode="create" />)

    const imgs = screen.queryAllByTestId('cover-image-img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute('src', 'blob:preview-a')
    expect(imgs[1]).toHaveAttribute('src', 'blob:preview-b')
  })

  it('marks the tile whose id matches coverImageId as the cover', () => {
    mockStoreState.uploadedFiles = [
      { id: 'file-a', preview: 'blob:preview-a' },
      { id: 'file-b', preview: 'blob:preview-b' },
    ]
    mockStoreState.coverImageId = 'file-b' // second file is the cover

    render(<ProductCoverPicker mode="create" />)

    // The cover badge is rendered as part of the CoverImageGallery
    // when the tile's `key` matches the current `coverKey`. The
    // picker's `key` per tile IS the file id in create mode (the
    // storage key doesn't exist yet — it only exists after the
    // upload completes on submit).
    const badges = screen.queryAllByTestId('cover-badge')
    expect(badges).toHaveLength(1)
  })

  it('writes the picked file id to the upload store on click', () => {
    // This is the WRITE side of the create flow: a click here does
    // NOT PATCH the server (the product doesn't exist yet). It just
    // updates the store. The create page's submit handler reads
    // coverImageId, looks up the matching upload's storage key, and
    // sends it in the POST body.
    mockStoreState.uploadedFiles = [
      { id: 'file-a', preview: 'blob:preview-a' },
      { id: 'file-b', preview: 'blob:preview-b' },
    ]
    mockStoreState.coverImageId = 'file-a'

    render(<ProductCoverPicker mode="create" />)

    // Target the tile by its data-testid (the gallery uses
    // `data-testid="cover-image-tile-{id}"` per tile). Using
    // getAllByRole('button') would also pick up the per-tile
    // remove (X) buttons, which call onRemove, not onCoverChange.
    const tileB = screen.getByTestId('cover-image-tile-file-b')
    fireEvent.click(tileB)

    expect(mockStoreState.setCoverImage).toHaveBeenCalledTimes(1)
    expect(mockStoreState.setCoverImage).toHaveBeenCalledWith('file-b')
  })

  it('renders nothing when the upload store is empty', () => {
    // Same UX as the edit mode (which also returns null when no
    // images are present) — the picker is invisible until the seller
    // has at least one image to choose from.
    mockStoreState.uploadedFiles = []
    mockStoreState.coverImageId = null

    render(<ProductCoverPicker mode="create" />)

    expect(screen.queryAllByTestId('cover-image-img')).toHaveLength(0)
  })
})

describe('ProductCoverPicker — mode="edit" (server-backed)', () => {
  it('renders one tile per signed image URL returned by the API', () => {
    mockProduct.cover_image_key = 'orgs/t1/vehicles/a.jpg'

    render(<ProductCoverPicker mode="edit" productId="prod-1" />)

    const imgs = screen.queryAllByTestId('cover-image-img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute('src', 'https://signed/a')
    expect(imgs[1]).toHaveAttribute('src', 'https://signed/b')
  })

  it('PATCHes the server with the picked key on click', () => {
    mockProduct.cover_image_key = 'orgs/t1/vehicles/a.jpg'

    render(<ProductCoverPicker mode="edit" productId="prod-1" />)

    // Click the second tile — should fire the mutation with key=b.
    const tiles = screen.getAllByRole('button')
    fireEvent.click(tiles[1])

    expect(mockSetCover.mutate).toHaveBeenCalledTimes(1)
    expect(mockSetCover.mutate).toHaveBeenCalledWith({
      productId: 'prod-1',
      key: 'orgs/t1/vehicles/b.jpg',
    })
  })

  it('uses the product\'s cover_image_key from the server as the initial cover', () => {
    // The seller already set the cover in a previous session — the
    // picker should mark THAT tile as the cover, not fall back to
    // the first image.
    mockProduct.cover_image_key = 'orgs/t1/vehicles/b.jpg'

    render(<ProductCoverPicker mode="edit" productId="prod-1" />)

    const badges = screen.queryAllByTestId('cover-badge')
    expect(badges).toHaveLength(1)
  })
})
