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

  setUploading: (fileId: string, percent: number) => void
  addUploadedFile: (file: UploadedFile) => void
  updateFileStatus: (fileId: string, status: UploadedFile['status'], url?: string) => void
  removeUploadedFile: (fileId: string) => void
  clearAll: () => void
}

export const useUploadStore = create<UploadStore>((set) => ({
  uploadProgress: new Map(),
  uploadedFiles: [],

  setUploading: (fileId, percent) =>
    set((state) => {
      const newProgress = new Map(state.uploadProgress)
      newProgress.set(fileId, percent)
      return { uploadProgress: newProgress }
    }),

  addUploadedFile: (file) =>
    set((state) => ({
      uploadedFiles: [...state.uploadedFiles, file],
    })),

  updateFileStatus: (fileId, status, url) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.map((f) =>
        f.id === fileId ? { ...f, status, url } : f
      ),
    })),

  removeUploadedFile: (fileId) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((f) => f.id !== fileId),
      uploadProgress: new Map(
        [...state.uploadProgress].filter(([id]) => id !== fileId)
      ),
    })),

  clearAll: () =>
    set({
      uploadProgress: new Map(),
      uploadedFiles: [],
    }),
}))
