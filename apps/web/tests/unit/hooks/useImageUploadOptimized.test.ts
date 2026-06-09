import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImageUploadOptimized } from "@/lib/hooks/useImageUploadOptimized";
import { useUploadStore } from "@/lib/stores/uploadStore";

// Mock the API functions
vi.mock("@/lib/api/images", () => ({
  uploadImageDirect: vi.fn(() =>
    Promise.resolve({
      url: "https://optimized-cloud-url.com/image.jpg?X-Amz-Signature=stale",
      key: "orgs/tenant-1/vehicles/abc-uuid.jpg",
    }),
  ),
}));

// Mock Zustand store. The hook reads `updateEntry` via the hook form
// and `images` via the static `getState()` (used by `uploadImages`),
// so the mock must expose BOTH.
vi.mock("@/lib/stores/uploadStore", () => {
  const store = Object.assign(
    vi.fn(() => ({ updateEntry: vi.fn() })),
    {
      getState: vi.fn(() => ({ images: [] as unknown[] })),
    },
  );
  return { useUploadStore: store };
});

type StoreImages = {
  images: Array<{
    id: string;
    file?: File;
    preview: string;
    status: string;
    storageKey?: string;
  }>;
};

function setStoreImages(images: StoreImages["images"]) {
  vi.mocked(useUploadStore.getState).mockReturnValue(images as never);
  // getState returns `{ images }`
  vi.mocked(useUploadStore.getState).mockReturnValue({ images } as never);
}

describe("useImageUploadOptimized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUploadStore.getState).mockReturnValue({ images: [] } as never);
  });

  it("returns uploadImage and uploadImages functions", () => {
    const { result } = renderHook(() => useImageUploadOptimized());

    expect(result.current.uploadImage).toBeDefined();
    expect(result.current.uploadImages).toBeDefined();
  });

  it("marks the entry uploading, then complete with the storage key", async () => {
    const mockUpdateEntry = vi.fn();
    vi.mocked(useUploadStore).mockReturnValue({
      updateEntry: mockUpdateEntry,
    } as never);

    const { result } = renderHook(() => useImageUploadOptimized());
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.uploadImage(file, "test-file-id");
    });

    // First: mark uploading.
    expect(mockUpdateEntry).toHaveBeenCalledWith("test-file-id", {
      status: "uploading",
    });
    // Then: mark complete with the REAL storage key. The signed url
    // becomes the entry's `preview` (ImageEntry has no `url` field).
    expect(mockUpdateEntry).toHaveBeenCalledWith("test-file-id", {
      status: "complete",
      storageKey: "orgs/tenant-1/vehicles/abc-uuid.jpg",
      preview:
        "https://optimized-cloud-url.com/image.jpg?X-Amz-Signature=stale",
    });
  });

  it("returns both url and key after successful upload", async () => {
    const { result } = renderHook(() => useImageUploadOptimized());
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    const uploaded = await act(async () => {
      return await result.current.uploadImage(file, "test-file-id");
    });

    expect(uploaded).toEqual({
      url: "https://optimized-cloud-url.com/image.jpg?X-Amz-Signature=stale",
      key: "orgs/tenant-1/vehicles/abc-uuid.jpg",
    });
  });

  it("marks the entry as error and rethrows on upload failure", async () => {
    const mockUpdateEntry = vi.fn();
    vi.mocked(useUploadStore).mockReturnValue({
      updateEntry: mockUpdateEntry,
    } as never);

    const { uploadImageDirect } = await import("@/lib/api/images");
    vi.mocked(uploadImageDirect).mockRejectedValueOnce(
      new Error("Upload failed"),
    );

    const { result } = renderHook(() => useImageUploadOptimized());
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    let error: Error | null = null;
    try {
      await act(async () => {
        await result.current.uploadImage(file, "test-file-id");
      });
    } catch (e) {
      error = e as Error;
    }

    expect(error).not.toBeNull();
    expect(error?.message).toBe("Upload failed");
    expect(mockUpdateEntry).toHaveBeenCalledWith("test-file-id", {
      status: "error",
    });
  });

  describe("uploadImages — reads in-flight entries from the store", () => {
    it("uploads every in-flight entry and returns {id, key, url} in order", async () => {
      const { uploadImageDirect } = await import("@/lib/api/images");
      let counter = 0;
      vi.mocked(uploadImageDirect).mockImplementation(async () => {
        const i = counter++;
        return {
          url: `https://signed.example.com/file-${i}?X-Amz-Signature=stale`,
          key: `orgs/tenant-1/vehicles/file-${i}.jpg`,
        };
      });

      setStoreImages([
        {
          id: "f1",
          file: new File(["a"], "a.jpg", { type: "image/jpeg" }),
          preview: "blob:a",
          status: "pending",
        },
        {
          id: "f2",
          file: new File(["b"], "b.jpg", { type: "image/jpeg" }),
          preview: "blob:b",
          status: "pending",
        },
        {
          id: "f3",
          file: new File(["c"], "c.jpg", { type: "image/jpeg" }),
          preview: "blob:c",
          status: "pending",
        },
      ]);

      const { result } = renderHook(() => useImageUploadOptimized());

      const uploaded = await act(async () => {
        return await result.current.uploadImages();
      });

      expect(uploaded.map((u) => u.id)).toEqual(["f1", "f2", "f3"]);
      expect(uploaded.map((u) => u.key)).toEqual([
        "orgs/tenant-1/vehicles/file-0.jpg",
        "orgs/tenant-1/vehicles/file-1.jpg",
        "orgs/tenant-1/vehicles/file-2.jpg",
      ]);
      // The keys MUST be raw paths, never the signed (expiring) URLs.
      for (const u of uploaded) {
        expect(u.key).not.toContain("?");
        expect(u.key).not.toContain("X-Amz-");
      }
    });

    it("skips seeded entries (no file) — they are already uploaded", async () => {
      setStoreImages([
        // Seeded: already in MinIO, no File. Must NOT be re-uploaded.
        {
          id: "orgs/t1/vehicles/seeded.jpg",
          preview: "https://signed/seeded",
          status: "complete",
          storageKey: "orgs/t1/vehicles/seeded.jpg",
        },
        // In-flight: has a File, must be uploaded.
        {
          id: "f1",
          file: new File(["a"], "a.jpg", { type: "image/jpeg" }),
          preview: "blob:a",
          status: "pending",
        },
      ]);

      const { result } = renderHook(() => useImageUploadOptimized());

      const uploaded = await act(async () => {
        return await result.current.uploadImages();
      });

      // Only the in-flight entry was uploaded.
      expect(uploaded).toHaveLength(1);
      expect(uploaded[0].id).toBe("f1");
    });

    it("returns an empty array when there are no in-flight entries", async () => {
      setStoreImages([
        {
          id: "orgs/t1/vehicles/seeded.jpg",
          preview: "https://signed/seeded",
          status: "complete",
          storageKey: "orgs/t1/vehicles/seeded.jpg",
        },
      ]);

      const { result } = renderHook(() => useImageUploadOptimized());

      const uploaded = await act(async () => {
        return await result.current.uploadImages();
      });

      expect(uploaded).toEqual([]);
    });
  });
});
