import { create } from 'zustand'

export interface UploadedFile {
  id: string
  file: File
  preview: string // URL.createObjectURL result
  progress: number // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  url?: string // Final cloud URL after processing
}

interface UploadStore {
  uploadProgress: Map<string, number>
  uploadedFiles: UploadedFile[]
  coverImageId: string | null

  setUploading: (fileId: string, percent: number) => void
  addUploadedFile: (file: UploadedFile) => void
  updateFileStatus: (fileId: string, status: UploadedFile['status'], url?: string) => void
  removeUploadedFile: (fileId: string) => void
  setCoverImage: (fileId: string) => void
  clearAll: () => void
}

export const useUploadStore = create<UploadStore>((set) => ({
  uploadProgress: new Map(),
  uploadedFiles: [],
  coverImageId: null,

  setUploading: (fileId, percent) =>
    set((state) => {
      const newProgress = new Map(state.uploadProgress)
      newProgress.set(fileId, percent)
      return { uploadProgress: newProgress }
    }),

  addUploadedFile: (file) =>
    set((state) => ({
      uploadedFiles: [...state.uploadedFiles, file],
      // Auto-set first image as cover if no cover selected
      coverImageId: state.coverImageId ?? file.id,
    })),

  updateFileStatus: (fileId, status, url) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.map((f) =>
        f.id === fileId ? { ...f, status, url } : f
      ),
    })),

  removeUploadedFile: (fileId) =>
    set((state) => {
      const newFiles = state.uploadedFiles.filter((f) => f.id !== fileId)
      const newProgress = new Map(
        [...state.uploadProgress].filter(([id]) => id !== fileId)
      )
      // Reset cover if removed image was the cover, or set first remaining as cover
      const newCoverId = state.coverImageId === fileId
        ? (newFiles.length > 0 ? newFiles[0].id : null)
        : state.coverImageId
      return {
        uploadedFiles: newFiles,
        uploadProgress: newProgress,
        coverImageId: newCoverId,
      }
    }),

  setCoverImage: (fileId) =>
    set({ coverImageId: fileId }),

  clearAll: () =>
    set({
      uploadProgress: new Map(),
      uploadedFiles: [],
      coverImageId: null,
    }),
}))
