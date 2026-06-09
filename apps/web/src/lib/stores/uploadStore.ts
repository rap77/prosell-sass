import { create } from "zustand";

/**
 * One entry in the unified image list managed by the upload store.
 *
 * The same entry shape covers two flows:
 *
 *   1. **In-flight** — the seller just dropped / pasted a file. The
 *      `file` is present, the `preview` is a blob: URL, the
 *      `status` is `pending` (or `uploading` while the upload is
 *      in flight, then `complete`). No `storageKey` until the
 *      upload finishes; the form's submit handler waits for the
 *      upload and reads the returned key.
 *
 *   2. **Seeded** — the entry was loaded from an existing product
 *      (edit flow). The `file` is absent (the bytes are already in
 *      MinIO), the `preview` is a signed URL, the `storageKey` is
 *      populated, the `status` is `complete`. The form's submit
 *      handler uses the storage key directly — no upload needed.
 *
 * The picker doesn't care which kind it is. Both render the same
 * tile, both can be picked as cover, both can be removed. The form
 * submit is the only place that branches on "do I need to upload
 * this or just send the key".
 */
export interface ImageEntry {
  id: string;
  /** Underlying File — only present for in-flight entries. */
  file?: File;
  /**
   * URL the picker renders into the <Image> tag. For in-flight
   * entries this is a blob: preview; for seeded entries it's the
   * signed URL the catalog uses.
   */
  preview: string;
  status: "pending" | "uploading" | "complete" | "error";
  /**
   * Storage key (`orgs/<uuid>/vehicles/<file>.jpg`). Populated
   * once the entry is `complete` — either by the upload hook
   * finishing, or by the entry being seeded from an existing
   * product (no upload needed in that case).
   */
  storageKey?: string;
}

interface UploadStore {
  /** Unified image list — replaces the old `uploadedFiles`. */
  images: ImageEntry[];
  /**
   * Id of the entry that is the cover. Identified by ENTRY id,
   * not storage key, because in-flight entries don't have a
   * storage key yet. The form's submit handler maps the picked
   * id back to a key.
   */
  coverImageId: string | null;

  /** Add a newly dropped / pasted / picked file as a pending entry. */
  addFile: (file: File) => string;
  /** Patch an entry's status / storageKey / preview. */
  updateEntry: (id: string, patch: Partial<ImageEntry>) => void;
  /** Remove an entry. If it was the cover, the cover resets. */
  removeEntry: (id: string) => void;
  /** Set the cover (by entry id). */
  setCoverImage: (id: string) => void;
  /**
   * Seed the store with entries loaded from an existing product
   * (edit flow). Each entry MUST have a `storageKey` and a
   * `preview` (signed URL) — no `file` is needed because the
   * bytes are already in MinIO. Clears any existing state first
   * (the form should re-seed on remount, not append).
   */
  seedImages: (entries: ImageEntry[]) => void;
  /** Clear everything — used on successful submit. */
  clearAll: () => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  images: [],
  coverImageId: null,

  addFile: (file) => {
    const id = crypto.randomUUID();
    set((state) => ({
      images: [
        ...state.images,
        {
          id,
          file,
          preview: URL.createObjectURL(file),
          status: "pending",
        },
      ],
      // Auto-pick the first image as cover if none set yet. Same
      // UX as the old behavior — the seller can change it
      // immediately. This avoids a "no cover" flash for the
      // first image added.
      coverImageId: state.coverImageId ?? id,
    }));
    return id;
  },

  updateEntry: (id, patch) =>
    set((state) => ({
      images: state.images.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  removeEntry: (id) =>
    set((state) => {
      const remaining = state.images.filter((e) => e.id !== id);
      // If the removed entry was the cover, reset the cover to
      // null (the form will pick a sensible default, e.g. the
      // first remaining image, or the seller will pick one).
      const coverImageId =
        state.coverImageId === id ? null : state.coverImageId;
      return { images: remaining, coverImageId };
    }),

  setCoverImage: (id) => set({ coverImageId: id }),

  seedImages: (entries) =>
    set({
      images: entries,
      // The first seeded entry becomes the initial cover if the
      // caller didn't include one in the product's data. The
      // caller can pass `coverImageId` separately if they want
      // to preserve the existing cover.
      coverImageId: entries[0]?.id ?? null,
    }),

  clearAll: () => set({ images: [], coverImageId: null }),
}));
