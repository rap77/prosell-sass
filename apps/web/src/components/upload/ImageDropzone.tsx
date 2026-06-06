'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { useUploadStore, type UploadedFile } from '@/lib/stores/uploadStore'
import { useClipboardPasteImage } from '@/lib/hooks/useClipboardPasteImage'

export function ImageDropzone() {
  const { addUploadedFile } = useUploadStore()

  // Single source of truth for "add this File to the upload preview".
  // The drop handler, the file-input handler, and the paste handler
  // all funnel through this — they differ only in HOW the File
  // arrives, not in WHAT we do with it.
  const addFile = useCallback(
    (file: File) => {
      const fileId = crypto.randomUUID()
      const uploadedFile: UploadedFile = {
        id: fileId,
        file,
        preview: URL.createObjectURL(file), // Immediate preview
        progress: 0,
        status: 'pending',
      }
      addUploadedFile(uploadedFile)
    },
    [addUploadedFile],
  )

  const onDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach(addFile)
  }

  // Paste-to-upload: a user with a screenshot in their clipboard can
  // press Ctrl/Cmd+V anywhere on the page and the file lands in the
  // upload preview. The hook owns the window listener and the
  // image-only filter; this component just hands the File off.
  useClipboardPasteImage(addFile)

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
            Drag &amp; drop images here, click to browse, or paste with Ctrl/⌘+V
          </p>
          <p className="text-sm text-muted-foreground">
            PNG, JPG, WebP up to 10MB each
          </p>
        </div>
      )}
    </div>
  )
}
