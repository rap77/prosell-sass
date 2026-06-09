"use client";

/**
 * CoverImageGallery — single source of truth for the "grid of images
 * with click-to-set cover" UX.
 *
 * Consumed today by `forms/ProductCoverPicker.tsx`, the single
 * store-backed picker used by ProductForm for BOTH create and edit.
 * The picker reads the unified image list (in-flight + seeded) from
 * the Zustand `uploadStore` and renders it through this gallery.
 *
 * The component is PURE: it does not know about stores, fetch, or
 * router. It takes data in and emits cover-pick events out. That keeps
 * the contract small, the test surface tight, and the same UX
 * available to any future consumer (catalog quick-edit, drag-and-drop
 * reorder extension, etc.) without re-implementing it.
 *
 * Image source: the consumer passes the `url` (blob URL for fresh
 * uploads, signed URL for existing images). The component renders
 * `<Image unoptimized>` for both — signed MinIO URLs cannot go
 * through `/_next/image` (the proxy 400s on them; see the catalog
 * `unoptimized` regression history) and blob URLs do not benefit
 * from the proxy.
 */

import Image from "next/image";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One tile in the gallery.
 *
 * - `id` is a stable React key + the argument for `onRemove(id)`.
 *   The consumer may use a UUID, a storage key, a temp upload id —
 *   whatever fits.
 * - `key` is the storage key (e.g. `orgs/<uuid>/vehicles/<file>.jpg`).
 *   It is the argument for `onCoverChange(key)` and is what the
 *   backend expects as `cover_image_key`.
 * - `url` is what the user actually sees: a blob URL during upload,
 *   or a signed MinIO URL on the edit form. The component passes it
 *   to `<Image>` verbatim.
 */
export interface CoverImageItem {
  id: string;
  key: string;
  url: string;
}

export interface CoverImageGalleryProps {
  images: CoverImageItem[];
  /** Storage key of the current cover, or null when none. */
  coverKey: string | null;
  /** Emitted with the picked key when the user clicks a non-cover tile. */
  onCoverChange: (key: string) => void;
  /**
   * Optional. When provided, each tile gets a remove button (X) and
   * `onRemove(id)` is emitted on click. Read-only consumers (e.g. the
   * detail view) omit this and get a clean grid with no X buttons.
   */
  onRemove?: (id: string) => void;
  /** Locks interaction while a mutation is in flight. */
  disabled?: boolean;
}

export function CoverImageGallery({
  images,
  coverKey,
  onCoverChange,
  onRemove,
  disabled = false,
}: CoverImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div
      data-testid="cover-image-gallery"
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {images.map((image, index) => {
        const isCover = image.key === coverKey;

        return (
          <div
            key={image.id}
            data-testid={`cover-image-tile-${image.id}`}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Set ${image.key.split("/").pop()} as cover`}
            aria-pressed={isCover}
            aria-disabled={disabled || undefined}
            className={cn(
              "relative group aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isCover && "ring-2 ring-primary ring-offset-2",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            // The whole tile is the click target for "set as cover".
            // The remove button stops propagation so clicking X
            // doesn't also fire a cover change.
            onClick={() => {
              if (disabled) return;
              onCoverChange(image.key);
            }}
            // Keyboard accessibility — Enter/Space do the same as
            // click. The role="button" + tabIndex make this discoverable
            // to screen readers; the keydown handler makes it actually
            // operable for keyboard users.
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCoverChange(image.key);
              }
            }}
          >
            <Image
              src={image.url}
              alt={`Imagen ${index + 1}`}
              fill
              unoptimized
              className="object-cover"
            />

            {/* Cover badge — only on the cover tile */}
            {isCover && (
              <div
                data-testid="cover-badge"
                className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
              >
                <Star className="w-3 h-3" />
                Cover
              </div>
            )}

            {/* Set-as-cover hint — only on non-cover tiles, only on hover */}
            {!isCover && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  Set as Cover
                </span>
              </div>
            )}

            {/* Optional remove button — opt-in via `onRemove` */}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (disabled) return;
                  onRemove(image.id);
                }}
                disabled={disabled}
                aria-label={`Remove image ${index + 1}`}
                data-testid={`cover-image-remove-${image.id}`}
                className="absolute top-2 right-2 bg-background/80 hover:bg-background p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
