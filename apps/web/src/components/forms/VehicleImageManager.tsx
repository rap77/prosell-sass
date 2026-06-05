'use client'

/**
 * VehicleImageManager — image management UI for the vehicle create/edit
 * form.
 *
 * Manages the LIST of image STORAGE KEYS attached to a vehicle. The DB
 * stores keys (e.g. `orgs/{tenant}/vehicles/{uuid}.jpg`), not signed URLs.
 *
 * Responsibilities:
 *   1. Show the current keys (received from `initialKeys`, typically the
 *      product's `image_urls` from the API).
 *   2. Allow uploading a new image; the upload returns a new `key`; the
 *      component adds it to the local list and notifies the parent via
 *      `onChange`.
 *   3. Allow deleting an image; the key is removed from the local list
 *      and `onChange` is called with the updated list.
 *
 * The parent form (ProductForm) is responsible for sending the final list
 * of keys in the create/update request.
 *
 * Signed URLs are NOT displayed here — the form is the editor, not the
 * viewer. The catalog detail view handles signed URL fetching.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Trash2, Upload, Loader2 } from 'lucide-react'
import { useImageUploadOptimized } from '@/lib/hooks/useImageUploadOptimized'
import { cn } from '@/lib/utils'

export interface VehicleImageManagerProps {
  /** Initial storage keys (e.g. from product.image_urls). */
  initialKeys: string[]
  /** Called whenever the list of keys changes. */
  onChange: (keys: string[]) => void
  /** Optional disabled state (e.g. while submitting the parent form). */
  disabled?: boolean
}

export function VehicleImageManager({
  initialKeys,
  onChange,
  disabled = false,
}: VehicleImageManagerProps) {
  const { uploadImage } = useImageUploadOptimized()
  const [keys, setKeys] = useState<string[]>(initialKeys)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keep local state in sync if the parent swaps `initialKeys` (e.g. async
  // product fetch resolves after the form mounts).
  useEffect(() => {
    setKeys(initialKeys)
  }, [initialKeys])

  // Stable onChange: notify the parent on every change.
  useEffect(() => {
    onChange(keys)
    // We intentionally exclude `onChange` from the dep array — a parent
    // that wraps `onChange` in a new closure every render would otherwise
    // cause a feedback loop. The contract is: `onChange` mirrors `keys`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys])

  const removeKey = useCallback((key: string) => {
    setKeys((prev) => prev.filter((k) => k !== key))
  }, [])

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      // Always clear the input so the same file can be re-selected later
      // (e.g. after an error).
      if (event.target) event.target.value = ''
      if (!file) return

      setIsUploading(true)
      setUploadError(null)
      try {
        // Generate a stable file id so the upload store can track progress
        // (we don't actually use the store here, but the hook requires it).
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const { key } = await uploadImage(file, fileId)
        if (key) {
          setKeys((prev) => [...prev, key])
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setIsUploading(false)
      }
    },
    [uploadImage],
  )

  // Memoize the row data so the rendered list is stable.
  const rows = useMemo(
    () => keys.map((key, index) => ({ key, index })),
    [keys],
  )

  return (
    <section
      className="flex flex-col gap-4"
      data-testid="vehicle-image-manager"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Imágenes del Vehículo</h2>
        <span className="text-sm text-muted-foreground">
          {keys.length} {keys.length === 1 ? 'imagen' : 'imágenes'}
        </span>
      </header>

      {/* Hidden file input — the visible button below triggers it. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        data-testid="vehicle-image-file-input"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {/* List of current images */}
      {rows.length > 0 ? (
        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          data-testid="vehicle-image-list"
        >
          {rows.map(({ key, index }) => (
            <li
              key={key}
              data-testid={`vehicle-image-key-${key}`}
              className={cn(
                'group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border',
                'bg-[var(--ps-bg-elevated)] border-[var(--ps-border-subtle)]',
              )}
            >
              <div className="flex flex-col items-center gap-1 p-3 text-center">
                <span className="text-xs font-medium text-[var(--ps-text-secondary)]">
                  Imagen {index + 1}
                </span>
                <span
                  className="break-all text-[10px] text-[var(--ps-text-disabled)]"
                  title={key}
                >
                  {key.split('/').pop()}
                </span>
              </div>
              <button
                type="button"
                data-testid={`delete-${key}`}
                onClick={() => removeKey(key)}
                disabled={disabled}
                aria-label={`Eliminar imagen ${index + 1}`}
                className={cn(
                  'absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full',
                  'bg-[var(--ps-bg-overlay)] text-[var(--ps-text-primary)] opacity-0 transition-opacity',
                  'group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--ps-bg-overlay-hover)]',
                  'disabled:opacity-50',
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className="rounded-lg border border-dashed border-[var(--ps-border-subtle)] p-6 text-center text-sm text-[var(--ps-text-secondary)]"
          data-testid="vehicle-image-empty"
        >
          Este vehículo aún no tiene imágenes. Subí una para empezar.
        </p>
      )}

      {/* Upload button + error display */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          data-testid="vehicle-image-upload-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className={cn(
            'inline-flex items-center justify-center gap-2 self-start rounded-md px-4 py-2 text-sm font-medium',
            'bg-[var(--ps-primary)] text-[var(--ps-text-inverse)] hover:bg-[var(--ps-primary-hover)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Subiendo…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Subir imagen
            </>
          )}
        </button>

        {uploadError && (
          <p
            role="alert"
            className="text-sm text-[var(--ps-danger)]"
            data-testid="vehicle-image-upload-error"
          >
            {uploadError}
          </p>
        )}
      </div>
    </section>
  )
}
