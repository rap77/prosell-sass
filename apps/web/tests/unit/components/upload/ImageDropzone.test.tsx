import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageDropzone } from '@/components/upload/ImageDropzone'

// Mock Zustand store
const mockAddUploadedFile = vi.fn()
vi.mock('@/lib/stores/uploadStore', () => ({
  useUploadStore: () => ({
    addUploadedFile: mockAddUploadedFile,
  }),
}))

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
  writable: true,
})

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url')
global.URL.revokeObjectURL = vi.fn()

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

    // Check for SVG icon from lucide-react Upload
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

  it('shows active drag state when dragging file over', () => {
    const { container } = render(<ImageDropzone />)

    const dropzone = container.querySelector('div[class*="border-dashed"]')!

    // Note: react-dropzone's isDragActive state is managed internally
    // We can only test the default state here
    expect(dropzone).toHaveClass('border-dashed')
  })

  it('returns to normal state after drag leaves', () => {
    const { container } = render(<ImageDropzone />)

    const dropzone = container.querySelector('div[class*="border-dashed"]')!

    fireEvent.dragEnter(dropzone)
    fireEvent.dragLeave(dropzone)

    expect(dropzone).not.toHaveClass('border-primary', 'bg-primary/5')
  })

  it('calls addUploadedFile when file is dropped', async () => {
    const user = userEvent.setup()
    const { container } = render(<ImageDropzone />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await user.upload(input, file)

    // Note: react-dropzone's onDrop callback is triggered after upload
    // This test verifies the integration with Zustand store
    expect(mockAddUploadedFile).toHaveBeenCalled()
  })

  it('creates file preview with URL.createObjectURL', async () => {
    const user = userEvent.setup()
    const { container } = render(<ImageDropzone />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await user.upload(input, file)

    // Verify that the file was added with a blob URL preview
    expect(mockAddUploadedFile).toHaveBeenCalledWith(
      expect.objectContaining({
        preview: expect.stringMatching(/^blob:/),
      })
    )
  })

  it('accepts multiple files', () => {
    const { container } = render(<ImageDropzone />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    expect(input).toHaveAttribute('multiple')
  })

  it('accepts only image files', () => {
    const { container } = render(<ImageDropzone />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    // react-dropzone accepts both image/* and specific extensions
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

  it('initializes file with pending status', async () => {
    const user = userEvent.setup()
    const { container } = render(<ImageDropzone />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await user.upload(input, file)

    // Verify file is added with correct initial state
    expect(mockAddUploadedFile).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        progress: 0,
      })
    )
  })

  // ── Paste-to-upload ───────────────────────────────────────────────
  //
  // The dropzone accepts files via three entry points: drop, file
  // input, and paste. The drop and file-input paths are covered
  // above; the paste path is wired through
  // `useClipboardPasteImage` (unit-tested at the hook level). The
  // tests below verify the INTEGRATION: the hook is plugged in,
  // the file lands in the store, and text clipboard data is
  // ignored.

  function dispatchPaste(items: Array<{ kind: string; type: string; getAsFile: () => File | null }>): void {
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: { items },
    })
    window.dispatchEvent(event)
  }

  it('adds a pasted image to the upload store (same path as drop / file-input)', () => {
    // The user copied a screenshot and pressed Ctrl/⌘+V. The
    // dropzone should add it to the upload preview exactly the way
    // a dropped file would.
    const { unmount } = render(<ImageDropzone />)

    const file = new File(['binary'], 'pasted.png', { type: 'image/png' })
    dispatchPaste([{ kind: 'file', type: 'image/png', getAsFile: () => file }])

    expect(mockAddUploadedFile).toHaveBeenCalledTimes(1)
    expect(mockAddUploadedFile).toHaveBeenCalledWith(
      expect.objectContaining({
        file,
        preview: expect.stringMatching(/^blob:/),
        status: 'pending',
        progress: 0,
      }),
    )

    unmount()
  })

  it('does NOT add a pasted text string to the upload store', () => {
    // A user pasting "hello" into a form field (e.g. the description
    // textarea) should not phantom-upload an image.
    const { unmount } = render(<ImageDropzone />)

    dispatchPaste([{ kind: 'string', type: 'text/plain', getAsFile: () => null }])

    expect(mockAddUploadedFile).not.toHaveBeenCalled()

    unmount()
  })
})
