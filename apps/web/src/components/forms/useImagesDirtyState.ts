"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import type { useProductImageUrls } from "@/lib/api/products";
import { useUploadStore, type ImageEntry } from "@/lib/stores/uploadStore";

type ExistingImageData = ReturnType<typeof useProductImageUrls>["data"];

/**
 * Images live in the Zustand uploadStore (ImageDropzone/ProductCoverPicker
 * write to it directly, no callback props into the form), so React Hook
 * Form's `isDirty` never sees an add/remove/reorder/cover change. This
 * hook seeds the store in edit mode, captures a baseline right after
 * seeding, and derives `imagesDirty` by comparing the store's current
 * images/cover against that baseline — the only way the form finds out
 * the store changed.
 *
 * Split out of UnifiedProductForm.tsx (react-doctor
 * no-high-complexity-react-function) — this is a self-contained concern
 * (seed → baseline → derive → reset-on-save) with a narrow surface.
 */
export function useImagesDirtyState({
  mode,
  productId,
  existingImageData,
}: {
  mode: "create" | "edit";
  productId: string | undefined;
  existingImageData: ExistingImageData;
}) {
  const seedImages = useUploadStore((s) => s.seedImages);
  const setCoverImage = useUploadStore((s) => s.setCoverImage);
  const images = useUploadStore((s) => s.images);
  const coverImageId = useUploadStore((s) => s.coverImageId);

  const [imagesBaseline, setImagesBaseline] = useState<{
    ids: string[];
    coverImageId: string | null;
  } | null>(null);

  // Seed images in edit mode AFTER data arrives
  useEffect(() => {
    // Only seed when we have actual image data (not during loading)
    if (
      mode === "edit" &&
      existingImageData?.images &&
      existingImageData.images.length > 0
    ) {
      logger.debug("Seeding images for edit mode", {
        productId,
        imageCount: existingImageData.images.length,
        coverKey: existingImageData.cover_image_key,
        images: existingImageData.images.map((img) => ({
          key: img.key,
          hasUrl: !!img.url,
        })),
      });
      const entries: ImageEntry[] = existingImageData.images.map((img) => ({
        id: crypto.randomUUID(),
        preview: img.url,
        storageKey: img.key,
        // GGA: no 'as const' - ImageEntry.status accepts literal "complete"
        status: "complete",
      }));
      seedImages(entries);

      // ponytail: restore cover from server if it exists
      let seededCoverId = entries[0]?.id ?? null;
      if (existingImageData.cover_image_key) {
        const coverEntry = entries.find(
          (e) => e.storageKey === existingImageData.cover_image_key,
        );
        if (coverEntry) {
          setCoverImage(coverEntry.id);
          seededCoverId = coverEntry.id;
        }
      }

      // Baseline for imagesDirty — captured AFTER seeding so the seed
      // itself never flips the flag, only a subsequent user action does.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time state capture once seed data arrives, same pattern as catalogFilterLogic.ts's appliedStatuses.
      setImagesBaseline({
        ids: entries.map((e) => e.id),
        coverImageId: seededCoverId,
      });
    } else if (mode === "edit") {
      logger.debug("Edit mode but no image data yet", {
        productId,
        hasData: !!existingImageData,
        imageCount: existingImageData?.images?.length ?? 0,
      });
    }
  }, [mode, productId, existingImageData, seedImages, setCoverImage]);

  // Derived (not state+effect): true when the uploadStore's current images
  // or cover diverge from the baseline captured right after seeding. This
  // is how an add/remove/reorder/cover change reaches `isSubmitDisabled`,
  // since ImageDropzone/ProductCoverPicker write to the store directly
  // with no callback into the form.
  const imagesDirty =
    imagesBaseline !== null &&
    (images.length !== imagesBaseline.ids.length ||
      images.some((e, i) => e.id !== imagesBaseline.ids[i]) ||
      coverImageId !== imagesBaseline.coverImageId);

  // Move the baseline to the just-saved state so imagesDirty reads false
  // again — call after a successful update (mirrors setOrgDirty(false)/
  // setBrokersDirty(false) in the form's own submit handler).
  function resetImagesBaseline() {
    setImagesBaseline({ ids: images.map((e) => e.id), coverImageId });
  }

  return { imagesDirty, resetImagesBaseline };
}
