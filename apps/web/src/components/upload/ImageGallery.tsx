'use client'

/**
 * ImageGallery — bulk-upload preview.
 *
 * Thin wrapper around the reusable `CoverImageGallery` that wires the
 * upload-flow data source (Zustand `uploadStore`) into the generic
 * UX. The cover-pick behavior, the star overlay, and the click-to-set
 * interaction are all delegated to `CoverImageGallery` — this wrapper
 * only knows how to:
 *   1. Read the upload list + cover from the store.
 *   2. Map the store's `UploadedFile` shape to the gallery's
 *      `CoverImageItem` shape (blob `preview` URL → `url`).
 *   3. Forward cover-pick and remove events to the store.
 *
 * Adding a new upload flow (e.g. an image picker for an ad creative)
 * becomes "wrap the data, hand it to CoverImageGallery" — no UX
 * duplication, no cover-pick logic to re-implement.
 *
 * Pre-upload behavior: the `key` is the file's temp upload id, not
 * a storage key (the storage key only exists once the upload
 * finishes). The store treats the `id` and the `key` as the same
 * value, which is correct for the upload-preview state. When this
 * preview is committed, the eventual cover gets persisted as a
 * proper storage key by the parent form's mutation.
 */

import { useUploadStore } from '@/lib/stores/uploadStore'
import {
  CoverImageGallery,
  type CoverImageItem,
} from '@/components/images/CoverImageGallery'

export function ImageGallery() {
  const { uploadedFiles, removeUploadedFile, coverImageId, setCoverImage } = useUploadStore()

  if (uploadedFiles.length === 0) return null

  // Map the store shape to the gallery's generic shape. During
  // upload, the `url` is a blob URL (URL.createObjectURL) — the
  // gallery passes it to <Image> verbatim, which renders it without
  // hitting the optimizer. See CoverImageGallery for why
  // `unoptimized` is set on every tile.
  const items: CoverImageItem[] = uploadedFiles.map((file) => ({
    id: file.id,
    // The store keys cover-pick by file id (the storage key is not
    // available until the upload completes). Using the same id for
    // the gallery's `key` keeps the round-trip with the store
    // consistent. Once the form commits, the cover id is replaced
    // with the real storage key on the server side.
    key: file.id,
    url: file.preview,
  }))

  return (
    <div className="mt-6">
      <CoverImageGallery
        images={items}
        coverKey={coverImageId}
        onCoverChange={setCoverImage}
        onRemove={removeUploadedFile}
      />
    </div>
  )
}
