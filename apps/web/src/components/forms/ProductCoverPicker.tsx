"use client";

/**
 * ProductCoverPicker — the single source of truth for the
 * seller-facing "pick which image is the cover" UX.
 *
 * Store-backed, polymorphic-free. The component reads from the
 * Zustand `uploadStore` (`images` + `coverImageId`) and writes
 * cover/remove events back. There is NO `mode` prop, NO server
 * PATCH on click, NO branch for "edit" vs "create".
 *
 * The difference between create and edit flows lives in the
 * FORM that mounts this component, not in the component itself:
 *
 *   - **Create flow**: the form starts with an empty store. The
 *     seller drops/pastes files into the `<ImageDropzone />`,
 *     which calls `addFile(file)`. The picker shows those files
 *     as the seller adds them. On submit, the form's handler
 *     uploads the in-flight entries and sends the resulting
 *     storage keys + the cover.
 *
 *   - **Edit flow**: the form starts by `seedImages()`-ing the
 *     store with the product's existing image list (storage keys
 *     + signed URLs, no files). The picker shows the existing
 *     images. The seller can add new files (via the same
 *     dropzone), remove existing ones, or pick a different
 *     cover. On submit, the form's handler PATCHes
 *     `image_urls` (the new list) + `cover_image_key`.
 *
 * Both flows use the SAME component, the SAME store, the SAME
 * UX surface. There is no `mode="edit"` branch — there is no
 * legacy code path. The original "single component for create
 * and edit" design is what this file actually implements.
 */

import { useUploadStore } from "@/lib/stores/uploadStore";
import {
  CoverImageGallery,
  type CoverImageItem,
} from "@/components/images/CoverImageGallery";

export function ProductCoverPicker() {
  const { images, coverImageId, setCoverImage, removeEntry, reorderImages } =
    useUploadStore();

  // Map the unified `ImageEntry` shape to the gallery's generic
  // shape. The gallery's `key` is what the form's submit handler
  // eventually reads to build the cover_image_key — for complete
  // (seeded or uploaded) entries we use the storage key; for
  // pending in-flight entries the storage key isn't known yet, so
  // we fall back to the entry id (the form will translate at
  // submit time, after the upload returns a key).
  const items: CoverImageItem[] = images.map((entry) => ({
    id: entry.id,
    key: entry.storageKey ?? entry.id,
    url: entry.preview,
  }));

  // ponytail: convert entry ID → storage key for the gallery's coverKey prop
  // The gallery compares image.key === coverKey, so we need the key, not the ID
  const coverEntry = images.find((e) => e.id === coverImageId);
  const coverKey = coverEntry?.storageKey ?? coverEntry?.id ?? null;

  // ponytail: convert storage key → entry ID when the gallery reports a cover change
  // The store expects an entry ID, but the gallery passes the storage key
  const handleCoverChange = (key: string) => {
    const entry = images.find((e) => (e.storageKey ?? e.id) === key);
    if (entry) {
      setCoverImage(entry.id);
    }
  };

  if (items.length === 0) return null;

  return (
    <CoverImageGallery
      images={items}
      coverKey={coverKey}
      onCoverChange={handleCoverChange}
      onRemove={removeEntry}
      onReorder={reorderImages}
    />
  );
}
