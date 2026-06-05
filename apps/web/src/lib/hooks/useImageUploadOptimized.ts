'use client'

import { useUploadStore } from '@/lib/stores/uploadStore'
import { uploadImageDirect } from '@/lib/api/images'

/**
 * Result of uploading a single image to the backend.
 *
 * - `url`:  a presigned URL valid for 1 hour. Used by the browser to preview
 *           the just-uploaded object during the current session. NEVER
 *           persist this — it expires and the DB column should hold the
 *           raw storage key, not a signed URL.
 * - `key`:  the raw S3 storage path, e.g. `orgs/{tenant}/vehicles/{uuid}.jpg`.
 *           This is the value that MUST be persisted into any storage-ref
 *           column (e.g. `product.image_urls`).
 */
export interface UploadedImage {
  url: string
  key: string
}

export function useImageUploadOptimized() {
  const { setUploading, updateFileStatus } = useUploadStore()

  /**
   * Upload a single image using optimized server-side flow.
   * Server handles: optimization + upload to DO Spaces
   * @param file The file to upload
   * @param fileId Existing UUID from upload store (NOT a new one)
   * @returns The signed `url` (preview, expires in 1h) AND the raw storage `key`
   *          (persist this in `product.image_urls`).
   */
  async function uploadImage(file: File, fileId: string): Promise<UploadedImage> {
    try {
      // 1. Mark as uploading in store
      updateFileStatus(fileId, 'uploading')
      setUploading(fileId, 50) // Show progress

      // 2. Upload to backend (optimizes + uploads to cloud)
      const { url, key } = await uploadImageDirect(file)

      // 3. Show completion progress
      setUploading(fileId, 100)

      // 4. Mark complete (store URL for preview only)
      updateFileStatus(fileId, 'complete', url)

      return { url, key }
    } catch (error) {
      updateFileStatus(fileId, 'error')
      throw error
    }
  }

  /**
   * Upload multiple images in parallel chunks (browser limit 3-4).
   * Pass files with their UUIDs from the upload store.
   * @returns Array of `{url, key}` records, one per file, in submission order.
   */
  async function uploadImages(
    files: Array<{ id: string; file: File }>
  ): Promise<UploadedImage[]> {
    const chunkSize = 3
    const chunks: Array<Array<{ id: string; file: File }>> = []

    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize))
    }

    const results: UploadedImage[] = []

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
