'use client'

/**
 * ProductCoverPicker — the single source of truth for the
 * seller-facing "pick which image is the cover" UX.
 *
 * Polymorphic on `mode`:
 *
 *   - `mode="create"` — store-backed. Reads the files in flight from
 *     the Zustand `uploadStore` (the seller has just dropped / pasted
 *     the images but the product doesn't exist yet, so there's no
 *     server-side cover to read). A click writes the picked file id
 *     back to the store via `setCoverImage`. The create page's
 *     submit handler then translates that file id to a storage key
 *     (after the upload completes) and includes it as
 *     `cover_image_key` in the POST /products body.
 *
 *   - `mode="edit"` — server-backed. Reads the product's existing
 *     image URLs from the API, PATCHes `cover_image_key` immediately
 *     on click. Used on the catalog edit page.
 *
 * Both modes render the same `CoverImageGallery` UX — only the data
 * source and the cover-change handler differ. That keeps the
 * user-facing surface consistent: a seller moving from create to
 * edit (or vice-versa) sees the same component, with the same
 * affordances, doing the same thing in spirit.
 *
 * Why one component, not two:
 *   The "pick which image is the cover" interaction is the same
 *   shape in both flows. Splitting it into `CreateCoverPicker` and
 *   `EditCoverPicker` would be duplication for the sake of
 *   duplication. The polymorphism keeps the contract small and the
 *   test surface tight.
 *
 * Why the data source lives outside the component:
 *   This component does NOT know about stores, fetch, or router. It
 *   takes the items + cover in, emits cover-pick events out. The
 *   data sources (uploadStore, useProduct + useProductImageUrls) are
 *   wired in here because they're the natural reading positions for
 *   the page, but the gallery below is pure. The single source of
 *   truth for the grid UX is `CoverImageGallery`.
 */

import {
  useProductImageUrls,
  useSetProductCover,
  useProduct,
} from '@/lib/api/products'
import { useUploadStore } from '@/lib/stores/uploadStore'
import {
  CoverImageGallery,
  type CoverImageItem,
} from '@/components/images/CoverImageGallery'

// Discriminated union: TypeScript enforces that `productId` is
// provided when `mode === 'edit'`. The `create` mode has no product
// to reference (the product is being created), so the field is
// absent.
export type ProductCoverPickerProps =
  | { mode: 'create' }
  | { mode: 'edit'; productId: string }

export function ProductCoverPicker(props: ProductCoverPickerProps) {
  if (props.mode === 'edit') {
    return <EditModePicker productId={props.productId} />
  }
  return <CreateModePicker />
}

// ─── Edit mode (server-backed) ────────────────────────────────────────

function EditModePicker({ productId }: { productId: string }) {
  const { data: product } = useProduct(productId)
  const { data: signed } = useProductImageUrls(productId)
  const setCover = useSetProductCover()

  // Map the signed-URL response to the gallery's generic shape.
  // The gallery needs an `id` (stable React key) and a `url` to
  // pass to <Image>. The signed URLs are short-lived — when they
  // expire, the parent re-fetches via `useProductImageUrls` and
  // the gallery re-renders with fresh URLs.
  const items: CoverImageItem[] =
    signed?.images
      .filter((img): img is typeof img & { url: string } => typeof img.url === 'string')
      .map((img) => ({
        id: img.key,
        key: img.key,
        url: img.url,
      })) ?? []

  return (
    <CoverImageGallery
      images={items}
      coverKey={product?.cover_image_key ?? null}
      onCoverChange={(key) => setCover.mutate({ productId, key })}
      disabled={setCover.isPending}
    />
  )
}

// ─── Create mode (store-backed) ──────────────────────────────────────

function CreateModePicker() {
  const { uploadedFiles, coverImageId, setCoverImage, removeUploadedFile } =
    useUploadStore()

  // In create mode the gallery's `key` is the FILE ID, not a storage
  // key — the storage key only exists once the upload completes on
  // submit. The store treats the file id and the cover as the same
  // value, which is correct for the in-flight preview state. When
  // the form commits, the create page's submit handler maps the
  // picked file id to its resulting storage key for the
  // `cover_image_key` field.
  const items: CoverImageItem[] = uploadedFiles.map((file) => ({
    id: file.id,
    key: file.id,
    url: file.preview,
  }))

  return (
    <CoverImageGallery
      images={items}
      coverKey={coverImageId}
      onCoverChange={setCoverImage}
      onRemove={removeUploadedFile}
    />
  )
}
