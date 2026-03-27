import { describe, it, expect } from 'vitest'

describe('BulkUpload', () => {
  it('validates CSV with Zod schema', () => {
    // TODO: Test validation catches wrong columns
  })

  it('shows error for invalid file type', () => {
    // TODO: Test .txt rejection
  })

  it('displays progress bar during upload', () => {
    // TODO: Test chunk progress (0-100%)
  })

  it('shows ETA based on chunk speed', () => {
    // TODO: Test ETA calculation
  })

  it('downloads failed rows CSV on error', () => {
    // TODO: Test error report download
  })
})
