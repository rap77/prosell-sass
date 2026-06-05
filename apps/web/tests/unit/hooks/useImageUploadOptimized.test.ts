import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImageUploadOptimized } from '@/lib/hooks/useImageUploadOptimized'
import { useUploadStore } from '@/lib/stores/uploadStore'

// Mock the API functions
vi.mock('@/lib/api/images', () => ({
  uploadImageDirect: vi.fn(() => Promise.resolve({
    url: 'https://optimized-cloud-url.com/image.jpg?X-Amz-Signature=stale',
    key: 'orgs/tenant-1/vehicles/abc-uuid.jpg',
  })),
}))

// Mock Zustand store
vi.mock('@/lib/stores/uploadStore', () => ({
  useUploadStore: vi.fn(() => ({
    setUploading: vi.fn(),
    updateFileStatus: vi.fn(),
  })),
}))

describe('useImageUploadOptimized', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns uploadImage and uploadImages functions', () => {
    const { result } = renderHook(() => useImageUploadOptimized())

    expect(result.current.uploadImage).toBeDefined()
    expect(result.current.uploadImages).toBeDefined()
  })

  it('uploads image with optimization progress tracking', async () => {
    const mockSetUploading = vi.fn()
    const mockUpdateFileStatus = vi.fn()
    vi.mocked(useUploadStore).mockReturnValue({
      setUploading: mockSetUploading,
      updateFileStatus: mockUpdateFileStatus,
    })

    const { result } = renderHook(() => useImageUploadOptimized())
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await act(async () => {
      await result.current.uploadImage(file, 'test-file-id')
    })

    // Should mark as uploading first
    expect(mockUpdateFileStatus).toHaveBeenCalledWith('test-file-id', 'uploading')
    // Should show progress at 50%
    expect(mockSetUploading).toHaveBeenCalledWith('test-file-id', 50)
    // Should show completion at 100%
    expect(mockSetUploading).toHaveBeenCalledWith('test-file-id', 100)
    // Should mark as complete with URL
    expect(mockUpdateFileStatus).toHaveBeenCalledWith(
      'test-file-id',
      'complete',
      'https://optimized-cloud-url.com/image.jpg?X-Amz-Signature=stale',
    )
  })

  it('handles multiple images in parallel chunks', async () => {
    const { result } = renderHook(() => useImageUploadOptimized())

    const files = [
      { id: 'file-1', file: new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }) },
      { id: 'file-2', file: new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }) },
      { id: 'file-3', file: new File(['test3'], 'test3.jpg', { type: 'image/jpeg' }) },
      { id: 'file-4', file: new File(['test4'], 'test4.jpg', { type: 'image/jpeg' }) },
    ]

    const results = await act(async () => {
      return await result.current.uploadImages(files)
    })

    // Should return 4 records
    expect(results).toHaveLength(4)
  })

  it('uploads in chunks of 3 images', async () => {
    const { result } = renderHook(() => useImageUploadOptimized())

    const files = Array.from({ length: 7 }, (_, i) => ({
      id: `file-${i}`,
      file: new File([`test${i}`], `test${i}.jpg`, { type: 'image/jpeg' }),
    }))

    const results = await act(async () => {
      return await result.current.uploadImages(files)
    })

    // Should return 7 records
    expect(results).toHaveLength(7)
  })

  it('rolls back on upload error', async () => {
    const mockUpdateFileStatus = vi.fn()
    vi.mocked(useUploadStore).mockReturnValue({
      setUploading: vi.fn(),
      updateFileStatus: mockUpdateFileStatus,
    })

    const { uploadImageDirect } = await import('@/lib/api/images')
    vi.mocked(uploadImageDirect).mockRejectedValueOnce(new Error('Upload failed'))

    const { result } = renderHook(() => useImageUploadOptimized())
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    let error: Error | null = null
    try {
      await act(async () => {
        await result.current.uploadImage(file, 'test-file-id')
      })
    } catch (e) {
      error = e as Error
    }

    expect(error).not.toBeNull()
    expect(error?.message).toBe('Upload failed')
    expect(mockUpdateFileStatus).toHaveBeenCalledWith('test-file-id', 'error')
  })

  it('returns both url and key after successful upload', async () => {
    const { result } = renderHook(() => useImageUploadOptimized())
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    const uploaded = await act(async () => {
      return await result.current.uploadImage(file, 'test-file-id')
    })

    // The hook returns BOTH the presigned URL (preview) AND the raw key
    // (which MUST be persisted into product.image_urls).
    expect(uploaded).toEqual({
      url: 'https://optimized-cloud-url.com/image.jpg?X-Amz-Signature=stale',
      key: 'orgs/tenant-1/vehicles/abc-uuid.jpg',
    })
  })

  it('simpler flow: no polling needed (single API call)', async () => {
    const mockUpdateFileStatus = vi.fn()
    vi.mocked(useUploadStore).mockReturnValue({
      setUploading: vi.fn(),
      updateFileStatus: mockUpdateFileStatus,
    })

    const { result } = renderHook(() => useImageUploadOptimized())
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await act(async () => {
      await result.current.uploadImage(file, 'test-file-id')
    })

    // Should NOT have 'processing' status (no polling phase)
    expect(mockUpdateFileStatus).toHaveBeenCalledWith('test-file-id', 'uploading')
    expect(mockUpdateFileStatus).toHaveBeenCalledWith('test-file-id', 'complete', expect.any(String))
    expect(mockUpdateFileStatus).not.toHaveBeenCalledWith('test-file-id', 'processing')
  })

  describe('regression: must return storage key (not signed URL) for image_urls', () => {
    /**
     * Bug: previously the hook only returned the signed URL. The create page
     * stored that into product.image_urls, which then expired in 1h and
     * caused the image-urls signer to produce malformed URLs (signed against
     * a key that already contained `?X-Amz-...`).
     *
     * The fix: the hook returns `{url, key}` and callers persist `key`.
     */
    it('uploaded.key is a raw S3 path (no query string)', async () => {
      const { result } = renderHook(() => useImageUploadOptimized())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      const uploaded = await act(async () => {
        return await result.current.uploadImage(file, 'test-file-id')
      })

      expect('key' in uploaded).toBe(true)
      expect(typeof uploaded.key).toBe('string')
      // The key MUST be a raw path, not a signed URL.
      expect(uploaded.key).not.toContain('?')
      expect(uploaded.key).not.toContain('X-Amz-')
      expect(uploaded.key).toMatch(/^orgs\/.+\/vehicles\/.+\.jpg$/)
    })

    it('uploadImages returns key for every file (preserves order)', async () => {
      // Override the mock to return a distinct key per call
      const { uploadImageDirect } = await import('@/lib/api/images')
      let counter = 0
      vi.mocked(uploadImageDirect).mockImplementation(async () => {
        const i = counter++
        return {
          url: `https://signed.example.com/file-${i}?X-Amz-Signature=stale`,
          key: `orgs/tenant-1/vehicles/file-${i}.jpg`,
        }
      })

      const { result } = renderHook(() => useImageUploadOptimized())
      const files = [
        { id: 'f1', file: new File(['a'], 'a.jpg', { type: 'image/jpeg' }) },
        { id: 'f2', file: new File(['b'], 'b.jpg', { type: 'image/jpeg' }) },
        { id: 'f3', file: new File(['c'], 'c.jpg', { type: 'image/jpeg' }) },
      ]

      const uploaded = await act(async () => {
        return await result.current.uploadImages(files)
      })

      // The order of returned records must match the order of input files.
      expect(uploaded.map((u) => u.key)).toEqual([
        'orgs/tenant-1/vehicles/file-0.jpg',
        'orgs/tenant-1/vehicles/file-1.jpg',
        'orgs/tenant-1/vehicles/file-2.jpg',
      ])
      // The URLs (signed, expiring) MUST be distinct from the keys.
      for (const u of uploaded) {
        expect(u.key).not.toBe(u.url)
        expect(u.key).not.toContain('?')
      }
    })
  })
})
