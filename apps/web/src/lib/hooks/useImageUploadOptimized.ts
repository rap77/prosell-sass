"use client";

import { useUploadStore } from "@/lib/stores/uploadStore";
import { uploadImageDirect } from "@/lib/api/images";

/**
 * Result of uploading a single image to the backend.
 *
 * - `url`:  a presigned URL valid for 1 hour. Used by the browser to preview
 *           the just-uploaded object during the current session. NEVER
 *           persist this — it expires and the DB column should hold the
 *           raw storage key, not a signed URL.
 * - `key`:  the raw S3 storage path, e.g. `orgs/{tenant}/vehicles/{uuid}.jpg`.
 *           This is the value that MUST be persisted into any storage-ref
 *           column (e.g. `product.image_urls`).
 */
export interface UploadedImage {
  url: string;
  key: string;
}

/**
 * Hook that drives the upload of in-flight images (entries with a
 * `file`) and writes the resulting `storageKey` + signed URL back
 * to the store. The form's submit handler reads the store after
 * invoking this hook to get the final list of storage keys.
 *
 * Seeded entries (loaded from an existing product, no `file`) are
 * skipped — they're already in MinIO, no upload needed.
 */
export function useImageUploadOptimized() {
  const { updateEntry } = useUploadStore();

  /**
   * Upload a single image using the optimized server-side flow.
   * Server handles: optimization + upload to DO Spaces.
   * @param file The file to upload
   * @param fileId Existing entry id from the upload store
   * @param organizationId Optional target org (admin cross-org product creation)
   * @returns The signed `url` (preview, expires in 1h) AND the raw storage `key`
   *          (persist this in `product.image_urls`).
   */
  async function uploadImage(
    file: File,
    fileId: string,
    organizationId?: string,
  ): Promise<UploadedImage> {
    try {
      updateEntry(fileId, { status: "uploading" });

      // Upload to backend (optimizes + uploads to cloud)
      const { url, key } = await uploadImageDirect(file, organizationId);

      // Mark complete with the real storage key. The picker's tile
      // and the form's submit handler now both have a real key to
      // work with. The signed `url` becomes the entry's `preview`
      // (ImageEntry has no separate `url` field — preview is what the
      // gallery renders).
      updateEntry(fileId, {
        status: "complete",
        storageKey: key,
        preview: url,
      });

      return { url, key };
    } catch (error) {
      updateEntry(fileId, { status: "error" });
      throw error;
    }
  }

  /**
   * Upload every in-flight image (entries with a `file`) and write
   * the resulting keys back to the store. Seeded entries are
   * skipped — they're already uploaded.
   *
   * Returns the list of `{id, key}` for the in-flight uploads
   * (in input order), so the caller can build the final image
   * list (seeded + in-flight, by id) at submit time.
   *
   * @param organizationId Optional target org (admin cross-org product creation)
   * @returns Array of `{id, key}` records, one per in-flight entry.
   */
  async function uploadImages(
    organizationId?: string,
  ): Promise<Array<{ id: string; key: string; url: string }>> {
    const { images } = useUploadStore.getState();
    const inFlight = images.filter((e) => e.file);
    if (inFlight.length === 0) return [];

    // Chunked concurrency: browsers cap parallel requests at ~6;
    // 3 keeps us well under that and gives the network breathing room.
    const chunkSize = 3;
    const results: Array<{ id: string; key: string; url: string }> = [];
    for (let i = 0; i < inFlight.length; i += chunkSize) {
      const chunk = inFlight.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(({ id, file }) => {
          if (!file)
            throw new Error(`In-flight entry ${id} is missing its file`);
          return uploadImage(file, id, organizationId);
        }),
      );
      for (const r of chunkResults) {
        // We don't have the id from the upload return — the
        // upload hook is called with the id, and the result is
        // for that id. The Promise.all preserves order, so we
        // can match by index in the chunk.
        const entry = chunk[chunkResults.indexOf(r)];
        results.push({ id: entry.id, key: r.key, url: r.url });
      }
    }
    return results;
  }

  return { uploadImage, uploadImages };
}
