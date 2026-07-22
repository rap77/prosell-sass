import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useImageCompression } from "./useImageCompression";

// Mock browser-image-compression
vi.mock("browser-image-compression", () => ({
  default: vi.fn(),
}));

import imageCompression from "browser-image-compression";

describe("useImageCompression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should compress image to <1MB", async () => {
    // Mock large file (5MB JPEG)
    const largeFile = new File(["x".repeat(5 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });

    // Mock compressed file (<1MB)
    const compressedFile = new File(["x".repeat(800 * 1024)], "large.webp", {
      type: "image/webp",
    });

    vi.mocked(imageCompression).mockResolvedValueOnce(compressedFile);

    const { result } = renderHook(() => useImageCompression());

    let compressed: File | null = null;
    await act(async () => {
      compressed = await result.current.compressImage(largeFile);
    });

    expect(compressed).toBeDefined();
    expect(compressed!.size).toBeLessThan(1 * 1024 * 1024); // <1MB
  });

  it("should convert JPEG to WebP", async () => {
    // Large file (>1MB) to trigger compression
    const jpegFile = new File(["x".repeat(2 * 1024 * 1024)], "photo.jpg", {
      type: "image/jpeg",
    });

    const webpFile = new File(["webp-data"], "photo.webp", {
      type: "image/webp",
    });

    vi.mocked(imageCompression).mockResolvedValueOnce(webpFile);

    const { result } = renderHook(() => useImageCompression());

    let compressed!: File;
    await act(async () => {
      compressed = await result.current.compressImage(jpegFile);
    });

    expect(compressed.type).toBe("image/webp");
  });

  it("should track compression progress", async () => {
    // Large file (>1MB) to trigger compression
    const file = new File(["x".repeat(2 * 1024 * 1024)], "photo.jpg", {
      type: "image/jpeg",
    });

    let progressCallback: ((progress: number) => void) | undefined;

    vi.mocked(imageCompression).mockImplementationOnce(async (_, options) => {
      progressCallback = options.onProgress;
      // Simulate progress updates
      if (progressCallback) {
        progressCallback(0);
        progressCallback(50);
        progressCallback(100);
      }
      return new File(["compressed"], "photo.webp", {
        type: "image/webp",
      });
    });

    const { result } = renderHook(() => useImageCompression());

    const progressUpdates: number[] = [];

    await act(async () => {
      await result.current.compressImage(file, (progress) => {
        progressUpdates.push(progress);
      });
    });

    // Progress should update from 0 → 100
    expect(progressUpdates).toContain(0);
    expect(progressUpdates).toContain(100);
  });

  it("should handle compression errors gracefully (fallback to original)", async () => {
    const originalFile = new File(["data"], "photo.jpg", {
      type: "image/jpeg",
    });

    // Simulate compression failure
    vi.mocked(imageCompression).mockRejectedValueOnce(
      new Error("Compression failed"),
    );

    const { result } = renderHook(() => useImageCompression());

    let compressed: File | null = null;
    await act(async () => {
      compressed = await result.current.compressImage(originalFile);
    });

    // Should fallback to original file
    expect(compressed).toBe(originalFile);
  });

  it("should use correct compression options", async () => {
    // Large file (>1MB) to trigger compression
    const file = new File(["x".repeat(2 * 1024 * 1024)], "photo.jpg", {
      type: "image/jpeg",
    });

    vi.mocked(imageCompression).mockResolvedValueOnce(
      new File(["compressed"], "photo.webp", { type: "image/webp" }),
    );

    const { result } = renderHook(() => useImageCompression());

    await act(async () => {
      await result.current.compressImage(file);
    });

    // Verify compression options (spec requirements)
    expect(imageCompression).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        maxSizeMB: 1, // <1MB target
        maxWidthOrHeight: 1920, // HD resolution max
        useWebWorker: true, // Non-blocking
        fileType: "image/webp", // WebP conversion
      }),
    );
  });

  it("should skip compression for files already <1MB", async () => {
    // Small file (500KB)
    const smallFile = new File(["x".repeat(500 * 1024)], "small.jpg", {
      type: "image/jpeg",
    });

    const { result } = renderHook(() => useImageCompression());

    let compressed: File | null = null;
    await act(async () => {
      compressed = await result.current.compressImage(smallFile);
    });

    // ponytail: skip compression if already small, save CPU
    // Should return original file without calling imageCompression
    expect(imageCompression).not.toHaveBeenCalled();
    expect(compressed).toBe(smallFile);
  });
});
