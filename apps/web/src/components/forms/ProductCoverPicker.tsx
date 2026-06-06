'use client'

/**
 * ProductCoverPicker — seller-facing UI to pick which image is the
 * cover of an EXISTING product.
 *
 * Why this is a separate component (not merged into
 * `VehicleImageManager`):
 *   - `VehicleImageManager` is the editor for the list of storage
 *     keys: upload new, remove, notify the parent. It runs in both
 *     create and edit modes and does not touch the cover.
 *   - `ProductCoverPicker` runs ONLY in edit mode (it needs a
 *     product id to resolve signed URLs and a backend to persist
 *     the choice). It uses the reusable `CoverImageGallery` for
 *     the grid UX and `useSetProductCover` for the mutation.
 *
 *   Splitting them keeps each component's responsibilities small
 *   and makes the cover-pick UX available to any future surface
 *   (catalog quick-edit, etc.) without re-implementing it.
 *
 *   Single source of truth for the grid: `CoverImageGallery`.
 *   Single source of truth for "which image is the cover" in the
 *   read path: `getCoverImageKey` in `lib/api/productImages.ts`.
 *   This picker is the WRITE side of that contract.
 */

import { useProductImageUrls, useSetProductCover, useProduct } from '@/lib/api/products'
import {
  CoverImageGallery,
  type CoverImageItem,
} from '@/components/images/CoverImageGallery'

interface ProductCoverPickerProps {
  productId: string
}

export function ProductCoverPicker({ productId }: ProductCoverPickerProps) {
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
