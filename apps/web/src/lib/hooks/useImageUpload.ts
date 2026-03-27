'use client'

import { useCallback } from 'react'
import { useUploadStore } from '@/lib/stores/uploadStore'
import { generateUploadUrl, uploadToCloud, pollProcessingStatus } from '@/lib/api/images'

export function useImageUpload() {
  const { setUploading, updateFileStatus } = useUploadStore()

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const fileId = crypto.randomUUID()

    try {
      // 1. Generate presigned URL
      updateFileStatus(fileId, 'uploading')
      const { uploadUrl, fileId: backendFileId } = await generateUploadUrl(file.type)

      // 2. Upload to cloud with progress tracking
      await uploadToCloud(uploadUrl, file, fileId, (percent) => {
        setUploading(fileId, percent)
      })

      // 3. Poll for processing status
      updateFileStatus(fileId, 'processing')
      const { url } = await pollProcessingStatus(backendFileId)

      // 4. Mark complete
      updateFileStatus(fileId, 'complete', url)

      return url
    } catch (error) {
      updateFileStatus(fileId, 'error')
      throw error
    }
  }, [setUploading, updateFileStatus])

  const uploadImages = useCallback(async (files: File[]): Promise<string[]> => {
    // Upload 3-4 images in parallel (browser limit)
    const chunkSize = 3
    const chunks: File[][] = []

    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize))
    }

    const results: string[] = []

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(file => uploadImage(file))
      )
      results.push(...chunkResults)
    }

    return results
  }, [uploadImage])

  return {
    uploadImage,
    uploadImages,
  }
}
