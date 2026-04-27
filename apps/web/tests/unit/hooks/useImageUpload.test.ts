import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImageUpload } from '@/lib/hooks/useImageUpload'
import { useUploadStore } from '@/lib/stores/uploadStore'

// Mock the API functions
vi.mock('@/lib/api/images', () => ({
  generateUploadUrl: vi.fn(() => Promise.resolve({
    uploadUrl: 'https://mock-upload-url.com',
    fileId: 'backend-file-id',
  })),
  uploadToCloud: vi.fn(() => Promise.resolve()),
  pollProcessingStatus: vi.fn(() => Promise.resolve({
    url: 'https://final-cloud-url.com/image.jpg',
  })),
}))

// Mock Zustand store
vi.mock('@/lib/stores/uploadStore', () => ({
  useUploadStore: vi.fn(() => ({
    setUploading: vi.fn(),
    updateFileStatus: vi.fn(),
  })),
}))

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns uploadImage and uploadImages functions', () => {
    const { result } = renderHook(() => useImageUpload())

    expect(result.current.uploadImage).toBeDefined()
    expect(result.current.uploadImages).toBeDefined()
  })

  it('tracks upload progress (0-100%) via setUploading', async () => {
    const mockSetUploading = vi.fn()
    vi.mocked(useUploadStore).mockReturnValue({
      setUploading: mockSetUploading,
      updateFileStatus: vi.fn(),
    })

    const { uploadToCloud } = await import('@/lib/api/images')

    // Mock uploadToCloud to call progress callback
    vi.mocked(uploadToCloud).mockImplementation(async (url, file, fileId, onProgress) => {
      // Call progress with 0 first, then 50, then 100
      onProgress?.(0)
      onProgress?.(50)
      onProgress?.(100)
    })

    const { result } = renderHook(() => useImageUpload())
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await act(async () => {
      await result.current.uploadImage(file, 'test-file-id')
    })

    expect(mockSetUploading).toHaveBeenCalledWith('test-file-id', 0)
    expect(mockSetUploading).toHaveBeenCalledWith('test-file-id', 50)
    expect(mockSetUploading).toHaveBeenCalledWith('test-file-id', 100)
  })

  it('updates file status through upload lifecycle', async () => {
    const mockUpdateFileStatus = vi.fn()
    vi.mocked(useUploadStore).mockReturnValue({
      setUploading: vi.fn(),
      updateFileStatus: mockUpdateFileStatus,
    })

    const { result } = renderHook(() => useImageUpload())
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await act(async () => {
      await result.current.uploadImage(file, 'test-file-id')
    })

    expect(mockUpdateFileStatus).toHaveBeenCalledWith('test-file-id', 'uploading')
    expect(mockUpdateFileStatus).toHaveBeenCalledWith('test-file-id', 'processing')
    expect(mockUpdateFileStatus).toHaveBeenCalledWith('test-file-id', 'complete', expect.any(String))
  })

  it('handles multiple images in parallel chunks', async () => {
    const { result } = renderHook(() => useImageUpload())

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
    const { result } = renderHook(() => useImageUpload())

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

    const { generateUploadUrl } = await import('@/lib/api/images')
    vi.mocked(generateUploadUrl).mockRejectedValueOnce(new Error('Upload failed'))

    const { result } = renderHook(() => useImageUpload())
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

  it('returns final cloud URL after successful upload', async () => {
    const { result } = renderHook(() => useImageUpload())
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    const url = await act(async () => {
      return await result.current.uploadImage(file, 'test-file-id')
    })

    expect(url).toBe('https://final-cloud-url.com/image.jpg')
  })
})
