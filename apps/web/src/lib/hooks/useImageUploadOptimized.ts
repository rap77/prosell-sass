'use client'

import { useUploadStore } from '@/lib/stores/uploadStore'
import { uploadImageDirect } from '@/lib/api/images'

export function useImageUploadOptimized() {
  const { setUploading, updateFileStatus } = useUploadStore()

  /**
   * Upload a single image using optimized server-side flow.
   * Server handles: optimization + upload to DO Spaces
   * @param file The file to upload
   * @param fileId Existing UUID from upload store (NOT a new one)
   */
  async function uploadImage(file: File, fileId: string): Promise<string> {
    try {
      // 1. Mark as uploading in store
      updateFileStatus(fileId, 'uploading')
      setUploading(fileId, 50) // Show progress

      // 2. Upload to backend (optimizes + uploads to cloud)
      const { url } = await uploadImageDirect(file)

      // 3. Show completion progress
      setUploading(fileId, 100)

      // 4. Mark complete
      updateFileStatus(fileId, 'complete', url)

      return url
    } catch (error) {
      updateFileStatus(fileId, 'error')
      throw error
    }
  }

  /**
   * Upload multiple images in parallel chunks (browser limit 3-4).
   * Pass files with their UUIDs from the upload store.
   */
  async function uploadImages(files: Array<{ id: string; file: File }>): Promise<string[]> {
    const chunkSize = 3
    const chunks: Array<Array<{ id: string; file: File }>> = []

    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize))
    }

    const results: string[] = []

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(({ id: fileId, file }) => uploadImage(file, fileId))
      )
      results.push(...chunkResults)
    }

    return results
  }

  return { uploadImage, uploadImages }
}
