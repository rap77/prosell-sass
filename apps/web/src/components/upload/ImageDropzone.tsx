"use client";

import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { useUploadStore } from "@/lib/stores/uploadStore";
import { useClipboardPasteImage } from "@/lib/hooks/useClipboardPasteImage";

/**
 * ImageDropzone — entry point for new uploads.
 *
 * Single source of truth for "the user added a new File". Three
 * entry points funnel into the same store action:
 *
 *   1. Drag & drop    — `onDrop` from react-dropzone.
 *   2. File picker    — the visible <input type="file">.
 *   3. Clipboard paste — `useClipboardPasteImage` window listener.
 *
 * All three call `addFile(file)` from the upload store. The store
 * generates the id, builds the blob: preview, and (if no cover is
 * set yet) auto-picks the first file as the cover. The picker
 * (separate component) renders the store state.
 */
export function ImageDropzone() {
  const { addFile } = useUploadStore();

  const onDrop = (acceptedFiles: File[]) => {
    // Wrap so `addFile` gets ONLY the File — `forEach` would otherwise
    // pass (file, index, array), and the store action takes a single
    // File. Keeps the contract identical to the paste path below.
    acceptedFiles.forEach((file) => addFile(file));
  };

  // Paste-to-upload: a user with a screenshot in their clipboard can
  // press Ctrl/Cmd+V anywhere on the page and the file lands in the
  // store. The hook owns the window listener and the image-only
  // filter; this component just hands the File off.
  useClipboardPasteImage(addFile);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-colors duration-200
        ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }
      `}
    >
      <input {...getInputProps()} capture="environment" />

      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

      {isDragActive ? (
        <p className="text-lg font-medium">Drop images here...</p>
      ) : (
        <div>
          <p className="text-lg font-medium mb-1">
            Drag &amp; drop images here, click to browse, or paste with Ctrl/⌘+V
          </p>
          <p className="text-sm text-muted-foreground">
            PNG, JPG, WebP up to 10MB each
          </p>
        </div>
      )}
    </div>
  );
}
