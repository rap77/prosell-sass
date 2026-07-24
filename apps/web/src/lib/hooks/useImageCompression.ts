import imageCompression from "browser-image-compression";

/**
 * Hook for client-side image compression before upload.
 *
 * Features:
 * - Compresses images to <1MB (saves bandwidth on mobile)
 * - Converts to WebP (smaller than JPEG)
 * - Progress tracking via callback
 * - Error handling with fallback to original file
 * - Skips compression for files already <1MB (ponytail: save CPU)
 *
 * React 19: No useCallback needed - compiler handles memoization
 */
export function useImageCompression() {
  // React 19: regular function, compiler optimizes
  async function compressImage(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<File> {
    // ponytail: skip compression if file already <1MB
    if (file.size < 1 * 1024 * 1024) {
      return file;
    }

    try {
      const options = {
        maxSizeMB: 1, // Target <1MB
        maxWidthOrHeight: 1920, // HD resolution max
        useWebWorker: true, // Non-blocking (don't freeze UI)
        fileType: "image/webp", // Convert to WebP
        onProgress: onProgress, // Progress callback (0-100)
      };

      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      // ponytail: fallback to original on error, don't block upload
      console.error("Image compression failed, using original:", error);
      return file;
    }
  }

  return {
    compressImage,
  };
}
