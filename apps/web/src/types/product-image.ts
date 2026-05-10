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

  // Image URLs
  url: string; // Public URL of the image
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
 * Helper to get display URL (prefer thumbnail for thumbnails, full URL otherwise)
 */
export function getDisplayUrl(image: ProductImage, useThumbnail = false): string {
  if (useThumbnail && image.thumbnail_url) {
    return image.thumbnail_url;
  }
  return image.url;
}

/**
 * Helper to check if image has dimensions
 */
export function hasDimensions(image: ProductImage): boolean {
  return image.width !== null && image.width !== undefined &&
         image.height !== null && image.height !== undefined;
}

/**
 * Helper to calculate aspect ratio
 */
export function getAspectRatio(image: ProductImage): number | null {
  if (!hasDimensions(image) || !image.height || image.height === 0) {
    return null;
  }
  return image.width! / image.height;
}
