/**
 * VehicleImageManager — manages the list of image STORAGE KEYS attached to
 * a vehicle/product.
 *
 * Responsibilities:
 *   - Render the current images (with delete buttons)
 *   - Allow uploading new images (via useImageUploadOptimized) and add
 *     the returned `key` to the local list
 *   - Notify the parent (ProductForm) of the final list of keys via
 *     `onChange` so it can submit them in the create/update request
 *
 * The DB stores KEYS (e.g. `orgs/{tenant}/vehicles/{uuid}.jpg`), not signed
 * URLs. The manager deals in keys. The signed URLs are fetched on demand
 * by the catalog detail view, not by the form.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------- Mocks ----------------------------------------------------------

// Mock the upload hook so we can drive uploads synchronously.
const mockUploadImage = vi.fn()
const mockUploadImages = vi.fn()
vi.mock('@/lib/hooks/useImageUploadOptimized', () => ({
  useImageUploadOptimized: () => ({
    uploadImage: mockUploadImage,
    uploadImages: mockUploadImages,
  }),
}))

// Mock the signed-URL hook — for the manager we don't need actual signed
// URLs (the form is going to send keys on submit). We return an empty
// array so the gallery renders the empty state for the placeholder.
vi.mock('@/lib/api/products', () => ({
  useProductImageUrls: () => ({ data: { images: [] }, isLoading: false }),
}))

// Stable next/image mock — keep the assertions on alt text, not on real images.
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} data-testid="vehicle-image" />
  ),
}))

// ---------- Test -----------------------------------------------------------

import { VehicleImageManager } from '@/components/forms/VehicleImageManager'

function renderWithQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('VehicleImageManager', () => {
  beforeEach(() => {
    mockUploadImage.mockReset()
    mockUploadImages.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the current image keys in edit mode', async () => {
    const onChange = vi.fn()
    const initialKeys = [
      'orgs/tenant-1/vehicles/photo-1.jpg',
      'orgs/tenant-1/vehicles/photo-2.jpg',
    ]
    renderWithQuery(<VehicleImageManager initialKeys={initialKeys} onChange={onChange} />)

    // The manager should show a row per initial key.
    expect(screen.getByTestId('vehicle-image-key-orgs/tenant-1/vehicles/photo-1.jpg'))
      .toBeInTheDocument()
    expect(screen.getByTestId('vehicle-image-key-orgs/tenant-1/vehicles/photo-2.jpg'))
      .toBeInTheDocument()
  })

  it('starts with empty list in create mode (no initialKeys)', () => {
    const onChange = vi.fn()
    renderWithQuery(<VehicleImageManager initialKeys={[]} onChange={onChange} />)

    // No image rows should be rendered.
    expect(screen.queryAllByTestId(/^vehicle-image-key-/)).toHaveLength(0)
  })

  it('removes a key when its delete button is clicked and notifies onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const initialKeys = [
      'orgs/tenant-1/vehicles/photo-1.jpg',
      'orgs/tenant-1/vehicles/photo-2.jpg',
    ]
    renderWithQuery(<VehicleImageManager initialKeys={initialKeys} onChange={onChange} />)

    // Click the delete button on the first image.
    const deleteBtn = screen.getByTestId('delete-orgs/tenant-1/vehicles/photo-1.jpg')
    await user.click(deleteBtn)

    // The key is gone from the DOM.
    expect(
      screen.queryByTestId('vehicle-image-key-orgs/tenant-1/vehicles/photo-1.jpg'),
    ).not.toBeInTheDocument()
    // The other key is still there.
    expect(
      screen.getByTestId('vehicle-image-key-orgs/tenant-1/vehicles/photo-2.jpg'),
    ).toBeInTheDocument()
    // And onChange was called with the remaining keys.
    expect(onChange).toHaveBeenLastCalledWith([
      'orgs/tenant-1/vehicles/photo-2.jpg',
    ])
  })

  it('uploads a new image, adds its key, and notifies onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const newKey = 'orgs/tenant-1/vehicles/uploaded-1.jpg'

    // Drive the upload hook to return a known key.
    mockUploadImage.mockResolvedValue({
      url: 'http://signed.example.com/uploaded-1.jpg?X-Amz-Signature=stale',
      key: newKey,
    })

    const initialKeys: string[] = []
    renderWithQuery(<VehicleImageManager initialKeys={initialKeys} onChange={onChange} />)

    // Fire a change event on the file input.
    const fileInput = screen.getByTestId('vehicle-image-file-input')
    const file = new File(['img-bytes'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    // Wait for the async upload to complete and the key to be added.
    await waitFor(() => {
      expect(
        screen.getByTestId(`vehicle-image-key-${newKey}`),
      ).toBeInTheDocument()
    })

    // And onChange was called with the new key.
    expect(onChange).toHaveBeenLastCalledWith([newKey])
  })

  it('persists the latest list of keys across multiple add/remove actions', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    // Use a stable counter so the test can assert on specific keys.
    let counter = 0
    const uploadedKeys: string[] = []
    mockUploadImage.mockImplementation(async (_file: File, _fileId: string) => {
      const key = `orgs/tenant-1/vehicles/upload-${counter++}.jpg`
      uploadedKeys.push(key)
      return {
        url: `http://signed.example.com/${key}?X-Amz-Signature=stale`,
        key,
      }
    })

    const initialKeys: string[] = []
    renderWithQuery(<VehicleImageManager initialKeys={initialKeys} onChange={onChange} />)

    // Upload two files.
    const fileInput = screen.getByTestId('vehicle-image-file-input')
    const f1 = new File(['a'], 'a.jpg', { type: 'image/jpeg' })
    const f2 = new File(['b'], 'b.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, f1)
    await user.upload(fileInput, f2)

    // Wait for the two keys to be added.
    await waitFor(() => {
      expect(uploadedKeys).toHaveLength(2)
    })
    const [firstKey, secondKey] = uploadedKeys
    expect(screen.getByTestId(`vehicle-image-key-${firstKey}`)).toBeInTheDocument()
    expect(screen.getByTestId(`vehicle-image-key-${secondKey}`)).toBeInTheDocument()

    // Remove the first key.
    const deleteFirst = screen.getByTestId(`delete-${firstKey}`)
    await user.click(deleteFirst)

    // The latest onChange call should have only the second key.
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[]
    expect(lastCall).toEqual([secondKey])
  })
})
