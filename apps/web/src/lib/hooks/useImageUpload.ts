'use client'

import { useUploadStore } from '@/lib/stores/uploadStore'
import { generateUploadUrl, uploadToCloud, pollProcessingStatus } from '@/lib/api/images'

export function useImageUpload() {
  const { setUploading, updateFileStatus } = useUploadStore()

  /**
   * Upload a single image using pre-signed URL flow.
   * @param file The file to upload
   * @param fileId Existing UUID from upload store (NOT a new one)
   */
  async function uploadImage(file: File, fileId: string): Promise<string> {
    try {
      // 1. Mark as uploading in store
      updateFileStatus(fileId, 'uploading')

      // 2. Get pre-signed upload URL
      const { uploadUrl, fileId: backendFileId } = await generateUploadUrl(file.type)

      // 3. Upload to cloud with progress tracking
      await uploadToCloud(uploadUrl, file, fileId, (percent) => {
        setUploading(fileId, percent)
      })

      // 4. Processing phase
      updateFileStatus(fileId, 'processing')
      const { url } = await pollProcessingStatus(backendFileId)

      // 5. Mark complete
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
