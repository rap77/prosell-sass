'use client'

import Image from "next/image"
import { useUploadStore } from '@/lib/stores/uploadStore'
import { X, Star, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ImageGallery() {
  const { uploadedFiles, removeUploadedFile, coverImageId, setCoverImage } = useUploadStore()

  if (uploadedFiles.length === 0) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      {uploadedFiles.map((file, index) => {
        const isCover = file.id === coverImageId

        return (
          <div
            key={file.id}
            className={cn(
              "relative group aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all",
              isCover && "ring-2 ring-primary ring-offset-2"
            )}
            onClick={() => setCoverImage(file.id)}
          >
            {/* Preview image */}
            {/* Note: Using regular <img> instead of next/image because preview is a blob URL from URL.createObjectURL */}
            {/* Blob URLs are memory-only and don't benefit from next/image optimization */}
            {/* Final cloud URLs will use next/image in vehicle listing pages */}
            <Image
              src={file.preview}
              alt={`Upload ${index + 1}`}
              fill
              unoptimized
              className="object-cover"
            />

            {/* Cover badge */}
            {isCover && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Star className="w-3 h-3" />
                Cover
              </div>
            )}

            {/* Set as Cover button (shown on hover for non-cover images) */}
            {!isCover && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  Set as Cover
                </span>
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
              onClick={(e) => {
                e.stopPropagation()
                removeUploadedFile(file.id)
              }}
              className="absolute top-2 right-2 bg-background/80 hover:bg-background p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
