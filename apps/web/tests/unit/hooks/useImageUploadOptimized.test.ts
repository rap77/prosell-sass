import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImageUploadOptimized } from '@/lib/hooks/useImageUploadOptimized'
import { useUploadStore } from '@/lib/stores/uploadStore'

// Mock the API functions
vi.mock('@/lib/api/images', () => ({
  uploadImageDirect: vi.fn(() => Promise.resolve({
    url: 'https://optimized-cloud-url.com/image.jpg',
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
    expect(mockUpdateFileStatus).toHaveBeenCalledWith('test-file-id', 'complete', 'https://optimized-cloud-url.com/image.jpg')
  })

  it('handles multiple images in parallel chunks', async () => {
    const { result } = renderHook(() => useImageUploadOptimized())

    const files = [
      { id: 'file-1', file: new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }) },
      { id: 'file-2', file: new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }) },
      { id: 'file-3', file: new File(['test3'], 'test3.jpg', { type: 'image/jpeg' }) },
      { id: 'file-4', file: new File(['test4'], 'test4.jpg', { type: 'image/jpeg' }) },
    ]

    const urls = await act(async () => {
      return await result.current.uploadImages(files)
    })

    // Should return 4 URLs
    expect(urls).toHaveLength(4)
  })

  it('uploads in chunks of 3 images', async () => {
    const { result } = renderHook(() => useImageUploadOptimized())

    const files = Array.from({ length: 7 }, (_, i) => ({
      id: `file-${i}`,
      file: new File([`test${i}`], `test${i}.jpg`, { type: 'image/jpeg' }),
    }))

    const urls = await act(async () => {
      return await result.current.uploadImages(files)
    })

    // Should return 7 URLs
    expect(urls).toHaveLength(7)
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

  it('returns final optimized URL after successful upload', async () => {
    const { result } = renderHook(() => useImageUploadOptimized())
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    const url = await act(async () => {
      return await result.current.uploadImage(file, 'test-file-id')
    })

    expect(url).toBe('https://optimized-cloud-url.com/image.jpg')
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
})
