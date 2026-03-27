'use client'

import { useUploadStore } from '@/lib/stores/uploadStore'
import { X, Star, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ImageGallery() {
  const { uploadedFiles, removeUploadedFile } = useUploadStore()

  if (uploadedFiles.length === 0) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      {uploadedFiles.map((file, index) => (
        <div
          key={file.id}
          className="relative group aspect-square rounded-lg overflow-hidden border"
        >
          {/* Preview image */}
          <img
            src={file.preview}
            alt={`Upload ${index + 1}`}
            className="w-full h-full object-cover"
          />

          {/* Cover badge (first image only) */}
          {index === 0 && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Star className="w-3 h-3" />
              Cover
            </div>
          )}

          {/* Progress bar */}
          {file.status === 'uploading' || file.status === 'processing' ? (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          ) : null}

          {/* Error state */}
          {file.status === 'error' && (
            <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
          )}

          {/* Delete button */}
          <button
            onClick={() => removeUploadedFile(file.id)}
            className="absolute top-2 right-2 bg-background/80 hover:bg-background p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
