/**
 * Unit tests for `useClipboardPasteImage` — the single source of truth
 * for "user pasted an image, do something with it" across the catalog
 * upload flows.
 *
 * Why a hook (not a utility / not a component prop):
 *   Paste-to-upload is wired into `upload/ImageDropzone.tsx`, which
 *   hands each pasted image File to the Zustand `uploadStore` via
 *   `addFile` — the same entry point as drag-and-drop and the file
 *   picker. The hook owns the clipboard plumbing; the consumer
 *   provides its own `onImage` callback, so any future consumer
 *   reuses it the same way. No duplication, no regression risk.
 *
 * Scope:
 *   - Pastes an image → calls `onImage` with a File.
 *   - Pastes text only → does NOT call `onImage` (a user typing
 *     "hello" into the description textarea should not trigger
 *     a phantom image upload).
 *   - Pastes nothing → does NOT call `onImage`.
 *   - `enabled: false` → does NOT call `onImage` (lets a consumer
 *     temporarily opt out — e.g. while a mutation is in flight).
 *   - Unmounts → detaches the listener (no leaks across tests).
 *   - Multiple images in one paste → calls `onImage` once per image.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useClipboardPasteImage } from '@/lib/hooks/useClipboardPasteImage'

/**
 * Construct a `paste`-shaped event with a `clipboardData` property
 * the way the browser would. JSDOM does not implement
 * `new ClipboardEvent('paste', { clipboardData })` reliably, so we
 * build a plain Event and define `clipboardData` as a getter — same
 * shape our hook reads (`e.clipboardData.items`).
 */
function makePasteEvent(items: Array<{ kind: string; type: string; getAsFile: () => File | null }>): Event {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: { items },
  })
  return event
}

function imageItem(type: string, name: string): { kind: string; type: string; getAsFile: () => File } {
  const file = new File(['binary'], name, { type })
  return {
    kind: 'file',
    type,
    getAsFile: () => file,
  }
}

function textItem(text: string): { kind: string; type: string; getAsFile: () => null } {
  return {
    kind: 'string',
    type: 'text/plain',
    getAsFile: () => null,
  }
}

describe('useClipboardPasteImage', () => {
  afterEach(() => {
    // Make sure no stray listener from a previous test fires on the
    // next one. The hook removes itself on unmount; this is a
    // belt-and-suspenders cleanup for any test that forgets to
    // call `unmount()`.
    vi.restoreAllMocks()
  })

  it('calls onImage with a File when a paste event contains image data', () => {
    const onImage = vi.fn()
    renderHook(() => useClipboardPasteImage(onImage))

    const file = new File(['binary'], 'pasted.png', { type: 'image/png' })
    const event = makePasteEvent([imageItem('image/png', 'pasted.png')])
    // The closure captured the `file` from the item builder; both
    // reach the same File instance via getAsFile().
    ;(event as unknown as { clipboardData: { items: Array<{ getAsFile: () => File }> } })
      .clipboardData.items[0].getAsFile = () => file
    window.dispatchEvent(event)

    expect(onImage).toHaveBeenCalledTimes(1)
    expect(onImage).toHaveBeenCalledWith(file)
  })

  it('does NOT call onImage when the paste event contains only text', () => {
    // A user typing "hello" into a form textarea should not phantom-
    // upload an image. The hook only fires on `image/*` clipboard
    // data.
    const onImage = vi.fn()
    renderHook(() => useClipboardPasteImage(onImage))

    window.dispatchEvent(makePasteEvent([textItem('hello world')]))

    expect(onImage).not.toHaveBeenCalled()
  })

  it('does NOT call onImage when the clipboard is empty', () => {
    const onImage = vi.fn()
    renderHook(() => useClipboardPasteImage(onImage))

    window.dispatchEvent(makePasteEvent([]))

    expect(onImage).not.toHaveBeenCalled()
  })

  it('does NOT call onImage when enabled is false', () => {
    // Lets a consumer opt out — e.g. while a mutation is in flight
    // or while a form is submitting. The hook detaches (or simply
    // ignores) the listener when disabled.
    const onImage = vi.fn()
    renderHook(() => useClipboardPasteImage(onImage, { enabled: false }))

    window.dispatchEvent(makePasteEvent([imageItem('image/png', 'pasted.png')]))

    expect(onImage).not.toHaveBeenCalled()
  })

  it('detaches the paste listener on unmount', () => {
    // No leaks: after unmount, pasting an image does nothing.
    const onImage = vi.fn()
    const { unmount } = renderHook(() => useClipboardPasteImage(onImage))
    unmount()

    window.dispatchEvent(makePasteEvent([imageItem('image/png', 'pasted.png')]))

    expect(onImage).not.toHaveBeenCalled()
  })

  it('calls onImage once per image when multiple images are pasted at once', () => {
    // A user copies a screenshot of a window with several icons,
    // pastes it — some browsers expose each icon as a separate
    // item. We handle the general case: N images in → N callbacks.
    const onImage = vi.fn()
    renderHook(() => useClipboardPasteImage(onImage))

    const a = new File(['a'], 'a.png', { type: 'image/png' })
    const b = new File(['b'], 'b.jpg', { type: 'image/jpeg' })
    const event = makePasteEvent([
      { kind: 'file', type: 'image/png', getAsFile: () => a },
      { kind: 'file', type: 'image/jpeg', getAsFile: () => b },
    ])
    window.dispatchEvent(event)

    expect(onImage).toHaveBeenCalledTimes(2)
    expect(onImage).toHaveBeenNthCalledWith(1, a)
    expect(onImage).toHaveBeenNthCalledWith(2, b)
  })

  it('ignores non-image file types in a mixed clipboard (e.g. image + PDF)', () => {
    // Defensive: if the user pastes a PDF + an image, only the
    // image triggers the callback. A consumer that only knows how
    // to handle images should never see the PDF.
    const onImage = vi.fn()
    renderHook(() => useClipboardPasteImage(onImage))

    const pdf = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' })
    const png = new File(['png'], 'pasted.png', { type: 'image/png' })
    const event = makePasteEvent([
      { kind: 'file', type: 'application/pdf', getAsFile: () => pdf },
      { kind: 'file', type: 'image/png', getAsFile: () => png },
    ])
    window.dispatchEvent(event)

    expect(onImage).toHaveBeenCalledTimes(1)
    expect(onImage).toHaveBeenCalledWith(png)
  })
})
