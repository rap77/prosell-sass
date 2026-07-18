interface UploadUrlResponse {
  uploadUrl: string;
  fileId: string;
}

interface ProcessingStatusResponse {
  status: "pending" | "processing" | "complete" | "error";
  url?: string;
}

interface DirectUploadResponse {
  url: string;
}

/**
 * Generate presigned URL for direct cloud upload
 * @param fileType - MIME type (e.g., 'image/jpeg')
 * @returns Presigned URL and file ID
 */
export async function generateUploadUrl(
  fileType: string,
): Promise<UploadUrlResponse> {
  const res = await fetch("/api/v1/images/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content_type: fileType }),
  });

  if (!res.ok) throw new Error("Failed to generate upload URL");

  return res.json();
}

/**
 * Upload file directly to cloud storage via presigned URL
 * @param url - Presigned URL from backend
 * @param file - File to upload
 * @param fileId - Unique file identifier for progress tracking
 * @param onProgress - Callback for upload progress (0-100)
 */
export async function uploadToCloud(
  url: string,
  file: File,
  fileId: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Upload progress tracking
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error("Upload failed"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));

    xhr.open("PUT", url);
    xhr.send(file);
  });
}

/**
 * Poll backend for image processing status
 * Backend processes: thumbnails, WebP compression, EXIF stripping
 * @param fileId - File ID from upload URL generation
 * @returns Final cloud URL when processing complete
 */
export async function pollProcessingStatus(
  fileId: string,
): Promise<{ url: string }> {
  const maxAttempts = 30; // 30 attempts * 2s = 1 minute timeout
  let attempts = 0;

  while (attempts < maxAttempts) {
    const res = await fetch(`/api/v1/images/status/${fileId}`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to check processing status");

    const data: ProcessingStatusResponse = await res.json();

    if (data.status === "complete") {
      if (!data.url) throw new Error("Processing complete but no URL returned");
      return { url: data.url };
    }

    if (data.status === "error") {
      throw new Error("Processing failed");
    }

    // Wait 2 seconds before retrying
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error("Processing timeout");
}

/**
 * Upload image directly to backend with optimization
 * Backend will: optimize image, upload to DO Spaces, return presigned URL + key
 * @param file - File to upload
 * @param organizationId - Optional target org (admin cross-org product creation)
 * @returns `url` (presigned, expires in 1h — for browser preview only) and
 *          `key` (raw storage path — persist this in `product.image_urls`).
 */
export async function uploadImageDirect(
  file: File,
  organizationId?: string,
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (organizationId) formData.append("organization_id", organizationId);

  const res = await fetch("/api/v1/images/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
    // Note: Don't set Content-Type header for FormData - browser sets it with boundary
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || "Failed to upload image");
  }

  return res.json();
}
