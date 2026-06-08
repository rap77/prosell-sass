import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageDropzone } from '@/components/upload/ImageDropzone'

// ─── uploadStore mock ─────────────────────────────────────────────────
// The dropzone is a thin entry point: it hands a raw File to the
// store's `addFile`. The store (not the dropzone) generates the id,
// builds the blob preview, and sets the initial status. So these
// tests assert ONE thing about the store contract: `addFile` is
// called with the File. Everything else (preview, status) is the
// store's job and is covered by the store's own tests.
const mockAddFile = vi.fn()
vi.mock('@/lib/stores/uploadStore', () => ({
  useUploadStore: () => ({
    addFile: mockAddFile,
  }),
}))

describe('ImageDropzone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dropzone with proper styling', () => {
    const { container } = render(<ImageDropzone />)

    const dropzone = container.querySelector('div[class*="border-dashed"]')
    expect(dropzone).toBeInTheDocument()
    expect(dropzone).toHaveClass('border-2', 'border-dashed', 'rounded-lg')
  })

  it('shows upload icon', () => {
    const { container } = render(<ImageDropzone />)

    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('displays drag instruction text', () => {
    render(<ImageDropzone />)

    expect(screen.getByText(/drag & drop images here/i)).toBeInTheDocument()
  })

  it('displays click instruction text', () => {
    render(<ImageDropzone />)

    expect(screen.getByText(/click to browse/i)).toBeInTheDocument()
  })

  it('shows accepted file types', () => {
    render(<ImageDropzone />)

    expect(screen.getByText(/PNG, JPG, WebP up to 10MB each/i)).toBeInTheDocument()
  })

  it('returns to normal state after drag leaves', () => {
    const { container } = render(<ImageDropzone />)

    const dropzone = container.querySelector('div[class*="border-dashed"]')!

    fireEvent.dragEnter(dropzone)
    fireEvent.dragLeave(dropzone)

    expect(dropzone).not.toHaveClass('border-primary', 'bg-primary/5')
  })

  it('hands the dropped File to the store (addFile)', async () => {
    const user = userEvent.setup()
    const { container } = render(<ImageDropzone />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await user.upload(input, file)

    expect(mockAddFile).toHaveBeenCalledTimes(1)
    expect(mockAddFile).toHaveBeenCalledWith(expect.any(File))
  })

  it('accepts multiple files', () => {
    const { container } = render(<ImageDropzone />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    expect(input).toHaveAttribute('multiple')
  })

  it('accepts only image files', () => {
    const { container } = render(<ImageDropzone />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    expect(input.getAttribute('accept')).toContain('image')
    expect(input.getAttribute('accept')).toContain('.png')
    expect(input.getAttribute('accept')).toContain('.jpg')
  })

  it('has cursor-pointer for click interaction', () => {
    const { container } = render(<ImageDropzone />)

    const dropzone = container.querySelector('div[class*="border-dashed"]')

    expect(dropzone).toHaveClass('cursor-pointer')
  })

  it('shows "Drop images here..." text during active drag', () => {
    const { container } = render(<ImageDropzone />)

    const dropzone = container.querySelector('div[class*="border-dashed"]')!

    fireEvent.dragEnter(dropzone)

    expect(screen.getByText(/drop images here/i)).toBeInTheDocument()
  })

  // ── Paste-to-upload ───────────────────────────────────────────────
  //
  // The dropzone accepts files via three entry points: drop, file
  // input, and paste. All three funnel into the store's `addFile`.
  // The paste path is wired through `useClipboardPasteImage`
  // (unit-tested at the hook level). The tests below verify the
  // INTEGRATION: a pasted image File lands in the store, and text
  // clipboard data is ignored.

  function dispatchPaste(items: Array<{ kind: string; type: string; getAsFile: () => File | null }>): void {
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: { items },
    })
    window.dispatchEvent(event)
  }

  it('hands a pasted image File to the store (same path as drop / file-input)', () => {
    const { unmount } = render(<ImageDropzone />)

    const file = new File(['binary'], 'pasted.png', { type: 'image/png' })
    dispatchPaste([{ kind: 'file', type: 'image/png', getAsFile: () => file }])

    expect(mockAddFile).toHaveBeenCalledTimes(1)
    expect(mockAddFile).toHaveBeenCalledWith(file)

    unmount()
  })

  it('does NOT add a pasted text string to the store', () => {
    const { unmount } = render(<ImageDropzone />)

    dispatchPaste([{ kind: 'string', type: 'text/plain', getAsFile: () => null }])

    expect(mockAddFile).not.toHaveBeenCalled()

    unmount()
  })
})
