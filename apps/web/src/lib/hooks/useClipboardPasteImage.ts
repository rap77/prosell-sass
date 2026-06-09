"use client";

/**
 * useClipboardPasteImage — window-level paste listener that fires
 * `onImage(file)` for each image pasted from the clipboard.
 *
 * Why a hook (not a utility, not a component prop):
 *   Paste-to-upload is wired into `upload/ImageDropzone.tsx`, which
 *   hands each pasted image File to the Zustand `uploadStore` via
 *   `addFile` — the same entry point as drag-and-drop and the file
 *   picker. Keeping the clipboard plumbing in a hook means the
 *   dropzone just provides an `onImage` callback; the hook owns the
 *   parsing, filtering, and listener lifecycle. If a future consumer
 *   needs paste-to-upload, it reuses the hook the same way.
 *
 * Why a window listener (not a per-element handler):
 *   The `paste` event bubbles up from the focused element. Listening
 *   on `window` catches it regardless of focus, but the browser only
 *   routes the event to the document if the user is not in a form
 *   field that handles it itself — so a user typing "hello" into the
 *   description textarea does not trigger a phantom image upload.
 *   We then filter by `kind === 'file' && type.startsWith('image/')`
 *   as a second line of defense.
 *
 * Why a ref for `onImage`:
 *   The consumer's callback is recreated on every render. If we put
 *   it in the effect's dependency array, the listener is detached
 *   and re-attached on every render — wasteful, and (worse) easy to
 *   get wrong when the consumer is a TanStack mutation callback that
 *   changes identity. The ref lets the listener stay attached and
 *   always call the latest callback.
 */

import { useEffect, useRef } from "react";

export interface UseClipboardPasteImageOptions {
  /**
   * When false, the listener is not attached (or does nothing).
   * Lets a consumer temporarily opt out — e.g. while a mutation is
   * in flight or while the form is submitting. Defaults to true.
   */
  enabled?: boolean;
}

export function useClipboardPasteImage(
  onImage: (file: File) => void,
  options: UseClipboardPasteImageOptions = {},
): void {
  const { enabled = true } = options;

  // Keep the latest callback in a ref so the effect can depend only
  // on `enabled` without re-binding the listener on every render.
  const onImageRef = useRef(onImage);
  useEffect(() => {
    onImageRef.current = onImage;
  }, [onImage]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      // We typed the parameter as `Event` (not `ClipboardEvent`) so
      // this file does not depend on DOM lib types that some
      // environments don't ship. The shape we read — `clipboardData`
      // with an iterable `items` array — is what every browser
      // produces and what JSDOM provides under test.
      const data = (
        event as unknown as {
          clipboardData?: {
            items?: ArrayLike<{
              kind: string;
              type: string;
              getAsFile: () => File | null;
            }>;
          };
        }
      ).clipboardData;
      const items = data?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== "file") continue;
        if (!item.type || !item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (file) onImageRef.current(file);
      }
    };

    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [enabled]);
}
