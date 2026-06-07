/**
 * Unit tests for `ProductCoverPicker` — the single source of truth
 * for the seller-facing "pick which image is the cover" UX.
 *
 * The component is store-backed: it reads from the Zustand
 * `uploadStore` (the unified `images` array) and writes cover/remove
 * events back to the store. Both create and edit flows use the same
 * component — the difference between them lives in how the FLOW
 * seeds the store (create: empty, then user adds files; edit:
 * preloaded from the product's existing image list), not in the
 * component itself.
 *
 * Contract:
 *   - Reads `images` + `coverImageId` from the store.
 *   - On cover click: `setCoverImage(entryId)` — covers are
 *     identified by entry id, NOT storage key. In-flight entries
 *     don't have a storage key yet; the form's submit handler
 *     translates the picked id to a key at submit time.
 *   - On remove click (X): `removeEntry(entryId)`.
 *   - Renders nothing when `images` is empty.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductCoverPicker } from '@/components/forms/ProductCoverPicker'
import { useUploadStore, type ImageEntry } from '@/lib/stores/uploadStore'

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

// ─── uploadStore mock ────────────────────────────────────────────────
// The picker reads from a single source of truth (the store) and
// writes cover/remove events back. We expose the bare state +
// actions the picker needs; the rest of the store falls through.
const mockStore = {
  images: [] as ImageEntry[],
  coverImageId: null as string | null,
  setCoverImage: vi.fn(),
  removeEntry: vi.fn(),
}

vi.mock('@/lib/stores/uploadStore', () => ({
  useUploadStore: (selector?: (s: typeof mockStore) => unknown) =>
    selector ? selector(mockStore) : mockStore,
  // Re-export the ImageEntry type so the test can type its fixtures
  // against the real store shape. The actual type is also re-exported
  // from the real module; this lets the test compile without
  // importing the (mocked) module body.
  __esModule: true,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockStore.images = []
  mockStore.coverImageId = null
})

describe('ProductCoverPicker — render', () => {
  it('renders one tile per image in the store', () => {
    // Two entries: one in-flight (blob preview, no storage key yet),
    // one seeded from an existing product (signed URL, has storage
    // key). The picker doesn't care which is which — both are
    // images, both get a tile.
    mockStore.images = [
      { id: 'file-a', preview: 'blob:preview-a', status: 'pending' },
      {
        id: 'seeded-1',
        preview: 'https://signed/existing',
        status: 'complete',
        storageKey: 'orgs/t1/vehicles/existing.jpg',
      },
    ]

    render(<ProductCoverPicker />)

    const imgs = screen.queryAllByTestId('cover-image-img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute('src', 'blob:preview-a')
    expect(imgs[1]).toHaveAttribute('src', 'https://signed/existing')
  })

  it('marks the tile whose id matches coverImageId as the cover', () => {
    // The cover is identified by the ENTRY id (not the storage key).
    // This is the contract: a click writes the entry's id to the
    // store, and the picker matches on id. The form's submit
    // handler later translates the picked id to a storage key.
    mockStore.images = [
      { id: 'a', preview: 'blob:a', status: 'pending' },
      { id: 'b', preview: 'blob:b', status: 'pending' },
    ]
    mockStore.coverImageId = 'b'

    render(<ProductCoverPicker />)

    const badges = screen.queryAllByTestId('cover-badge')
    expect(badges).toHaveLength(1)
  })

  it('renders nothing when the store has no images', () => {
    // Same UX as before — the picker is invisible until at least
    // one image exists. The seller has to add an image first.
    mockStore.images = []
    mockStore.coverImageId = null

    render(<ProductCoverPicker />)

    expect(screen.queryAllByTestId('cover-image-img')).toHaveLength(0)
  })
})

describe('ProductCoverPicker — interaction', () => {
  it('writes the picked entry id to the store on cover click', () => {
    // The WRITE side of the contract. A click here does NOT PATCH
    // the server, does NOT call any mutation hook — it just
    // updates the store. The form's submit handler (in either
    // create or edit) reads coverImageId and sends the resolved
    // storage key in the request body.
    mockStore.images = [
      { id: 'a', preview: 'blob:a', status: 'pending' },
      { id: 'b', preview: 'blob:b', status: 'pending' },
    ]

    render(<ProductCoverPicker />)

    // Target the tile by data-testid — `getAllByRole('button')`
    // would also pick up the per-tile remove (X) buttons, which
    // call removeEntry, not setCoverImage.
    const tileB = screen.getByTestId('cover-image-tile-b')
    fireEvent.click(tileB)

    expect(mockStore.setCoverImage).toHaveBeenCalledTimes(1)
    expect(mockStore.setCoverImage).toHaveBeenCalledWith('b')
  })

  it('writes the picked entry id to the store even when clicking the already-cover tile', () => {
    // The contract is "every click emits" — keeps the consumer
    // (the form's submit) simple. The store's setCoverImage is
    // idempotent (same id, no-op).
    mockStore.images = [
      { id: 'a', preview: 'blob:a', status: 'pending' },
      { id: 'b', preview: 'blob:b', status: 'pending' },
    ]
    mockStore.coverImageId = 'a'

    render(<ProductCoverPicker />)

    fireEvent.click(screen.getByTestId('cover-image-tile-a'))

    expect(mockStore.setCoverImage).toHaveBeenCalledWith('a')
  })

  it('calls removeEntry when the X button is clicked', () => {
    // Each tile gets a remove button (X). The picker delegates
    // removal to the store; the store decides whether to also
    // clear the cover if the removed entry was the cover.
    mockStore.images = [
      { id: 'a', preview: 'blob:a', status: 'pending' },
      { id: 'b', preview: 'blob:b', status: 'pending' },
    ]

    render(<ProductCoverPicker />)

    const removeA = screen.getByTestId('cover-image-remove-a')
    fireEvent.click(removeA)

    expect(mockStore.removeEntry).toHaveBeenCalledTimes(1)
    expect(mockStore.removeEntry).toHaveBeenCalledWith('a')
  })
})
