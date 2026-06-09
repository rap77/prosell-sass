/**
 * Product image types matching backend entity
 *
 * Matches: apps/api/src/prosell/domain/entities/product_image.py
 */

/**
 * Product image entity
 */
export interface ProductImage {
  id: string;
  product_id: string;

  // Image URLs. `url` is `string | null` (not just `string`) because the
  // gallery helper (`getProductImages`) returns `null` when no signed URL
  // is available for a stored key — i.e. the underlying object exists in
  // the DB but its presigned URL was not resolved. `null` is the signal
  // for the gallery to render its empty state instead of feeding an
  // unreachable URL to `<Image>`.
  url: string | null;
  thumbnail_url?: string | null; // Smaller thumbnail version

  // Ordering and display
  sort_order: number; // Display order (default: 0)
  is_primary: boolean; // Primary image for product display

  // Metadata
  alt_text?: string | null; // Alt text for accessibility
  width?: number | null; // Image width in pixels
  height?: number | null; // Image height in pixels
  file_size_bytes?: number | null; // File size for storage tracking

  // Upload info
  storage_key?: string | null; // Storage path (e.g., DO Spaces key)
  content_type?: string | null; // e.g., "image/jpeg"

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Helper to get display URL (prefer thumbnail for thumbnails, full URL otherwise).
 * Returns `null` when no resolved URL is available — callers should treat that
 * as a signal to render the empty state rather than feeding an unreachable
 * URL to `<Image>`.
 */
export function getDisplayUrl(
  image: ProductImage,
  useThumbnail = false,
): string | null {
  if (useThumbnail && image.thumbnail_url) {
    return image.thumbnail_url;
  }
  return image.url;
}

/**
 * Helper to check if image has dimensions
 */
export function hasDimensions(image: ProductImage): boolean {
  return (
    image.width !== null &&
    image.width !== undefined &&
    image.height !== null &&
    image.height !== undefined
  );
}

/**
 * Helper to calculate aspect ratio. Returns `null` when dimensions are
 * missing or height is zero (avoids divide-by-zero).
 */
export function getAspectRatio(image: ProductImage): number | null {
  if (!hasDimensions(image) || !image.height || image.height === 0) {
    return null;
  }
  return (image.width ?? 0) / image.height;
}
