/**
 * Regression: CreateVehiclePage must persist STORAGE KEYS (not signed URLs)
 * into product.image_urls.
 *
 * Bug: previously the create page took the value returned by
 * `useImageUploadOptimized().uploadImages(...)` and put it directly into the
 * `image_urls` field of the create request. That return value was a signed
 * URL (`http://minio:9000/.../x.jpg?X-Amz-...`) which:
 *   1. expires after 1h, breaking the image silently;
 *   2. when re-fed to the image-urls signer, produces a malformed URL the
 *      browser cannot load (the signer treats the full path+query as the
 *      key, then mints a new signature on top of the old query string).
 *
 * Fix: the hook now returns `{url, key}` and the create page persists
 * `key`. This test pins that contract end-to-end on the page.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------- Mocks ----------------------------------------------------------

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useParams: () => ({}),
}))

// Mock the upload store: one file in the dropzone, no previews fetched.
const mockUploadedFile = {
  id: 'upload-1',
  file: new File(['img-bytes'], 'photo.jpg', { type: 'image/jpeg' }),
  preview: 'blob:http://test/preview',
  progress: 0,
  status: 'pending' as const,
}
vi.mock('@/lib/stores/uploadStore', () => ({
  useUploadStore: vi.fn(() => ({
    uploadedFiles: [mockUploadedFile],
    clearAll: vi.fn(),
    addUploadedFile: vi.fn(),
    setUploading: vi.fn(),
    updateFileStatus: vi.fn(),
    removeUploadedFile: vi.fn(),
    setCoverImage: vi.fn(),
  })),
}))

// Mock the upload hook to return a SIGNED URL and a STORAGE KEY.
const SIGNED_URL =
  'http://minio:9000/bucket/orgs/tenant-1/vehicles/upload-1.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=stale'
const STORAGE_KEY = 'orgs/tenant-1/vehicles/upload-1.jpg'

const capturedOnSubmit: { fn: ((d: unknown, urls: string[]) => Promise<void>) | null } = {
  fn: null,
}
vi.mock('@/components/forms/ProductForm', () => ({
  ProductForm: (props: { onSubmit?: (d: unknown, urls: string[]) => Promise<void> }) => {
    // Capture the onSubmit the page passed so we can invoke it directly.
    if (props.onSubmit) capturedOnSubmit.fn = props.onSubmit
    return (
      <div data-testid="mock-product-form">
        <button
          type="button"
          data-testid="mock-submit"
          onClick={() =>
            props.onSubmit?.(
              {
                vin: '1HGCM82633A123456',
                price: 10000,
                year: 2020,
                make: 'Honda',
                model: 'Civic',
                category_id: 'cat-1',
                description: 'Test',
                trim: '',
                body_type: '',
                drivetrain: '',
                transmission: '',
                engine: '',
                fuel_type: '',
                mileage: 0,
                mileage_unit: 'mi',
                exterior_color: '',
                interior_color: '',
                has_sunroof: false,
                has_navigation: false,
                has_leather: false,
                has_backup_camera: false,
                has_bluetooth: false,
                has_remote_start: false,
                seat_material: '',
                stock_number: '',
              },
              [],
            )
          }
        >
          Submit
        </button>
      </div>
    )
  },
}))

vi.mock('@/lib/hooks/useImageUploadOptimized', () => ({
  useImageUploadOptimized: vi.fn(() => ({
    uploadImages: vi.fn(async () => [{ url: SIGNED_URL, key: STORAGE_KEY }]),
    uploadImage: vi.fn(),
  })),
}))

// Mock the auth store.
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector: any) =>
    selector({ user: { id: 'user-1', organization_id: 'org-1' } }),
  ),
}))

// Mock the upload UI components to avoid drag/drop and gallery logic.
vi.mock('@/components/upload/ImageDropzone', () => ({
  ImageDropzone: () => null,
}))
vi.mock('@/components/upload/ImageGallery', () => ({
  ImageGallery: () => null,
}))

// Capture the fetch body so we can assert what was sent to /api/v1/products.
const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
  if (url === '/api/v1/products' && init?.method === 'POST') {
    return new Response(
      JSON.stringify({ id: 'product-1', title: 'Test', status: 'draft' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    )
  }
  return new Response('{}', { status: 200 })
})
// @ts-expect-error — global fetch mock for jsdom
global.fetch = mockFetch

// ---------- Test -----------------------------------------------------------

import CreateVehiclePage from '@/app/(seller)/catalog/create/page'

function renderWithQuery(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('CreateVehiclePage — image_urls must be STORAGE KEYS, not signed URLs', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    capturedOnSubmit.fn = null
  })

  afterEach(() => {
    cleanup()
  })

  it('sends image_urls with the storage KEY, not the signed URL', async () => {
    renderWithQuery(<CreateVehiclePage />)

    // The page rendered; the mock ProductForm captured the onSubmit callback.
    expect(capturedOnSubmit.fn).toBeTruthy()

    // Invoke the submit handler as the form would.
    await capturedOnSubmit.fn!(
      {
        vin: '1HGCM82633A123456',
        price: 10000,
        year: 2020,
        make: 'Honda',
        model: 'Civic',
        category_id: 'cat-1',
        description: 'Test',
        trim: '',
        body_type: '',
        drivetrain: '',
        transmission: '',
        engine: '',
        fuel_type: '',
        mileage: 0,
        mileage_unit: 'mi',
        exterior_color: '',
        interior_color: '',
        has_sunroof: false,
        has_navigation: false,
        has_leather: false,
        has_backup_camera: false,
        has_bluetooth: false,
        has_remote_start: false,
        seat_material: '',
        stock_number: '',
      },
      [],
    )

    // Wait for fetch to be called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    // Find the POST to /api/v1/products
    const postCall = mockFetch.mock.calls.find(
      (call) => call[0] === '/api/v1/products' && call[1]?.method === 'POST',
    )
    expect(postCall, 'POST /api/v1/products was not called').toBeDefined()

    const init = postCall![1] as RequestInit
    const body = JSON.parse(init.body as string)
    const imageUrls: string[] = body?.attributes?.image_urls ?? []

    // The array MUST contain the STORAGE KEY (raw S3 path).
    expect(imageUrls).toContain(STORAGE_KEY)
    // And MUST NOT contain the signed URL.
    expect(imageUrls).not.toContain(SIGNED_URL)
    // Sanity: the key is a raw path, no query string.
    for (const u of imageUrls) {
      expect(u).not.toMatch(/\?X-Amz-/)
      expect(u).not.toMatch(/^https?:\/\//)
    }
  })
})
