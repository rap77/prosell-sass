'use client'

import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { useUploadStore, type UploadedFile } from '@/lib/stores/uploadStore'

export function ImageDropzone() {
  const { addUploadedFile } = useUploadStore()

  const onDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const fileId = crypto.randomUUID()

      const uploadedFile: UploadedFile = {
        id: fileId,
        file,
        preview: URL.createObjectURL(file), // Immediate preview
        progress: 0,
        status: 'pending',
      }

      addUploadedFile(uploadedFile)
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50'
        }
      `}
    >
      <input {...getInputProps()} />

      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

      {isDragActive ? (
        <p className="text-lg font-medium">Drop images here...</p>
      ) : (
        <div>
          <p className="text-lg font-medium mb-1">
            Drag & drop images here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            PNG, JPG, WebP up to 10MB each
          </p>
        </div>
      )}
    </div>
  )
}
