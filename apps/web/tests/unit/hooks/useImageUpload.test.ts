import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'

describe('useImageUpload', () => {
  it('tracks upload progress (0-100%)', () => {
    // TODO: Test Zustand progress updates
  })

  it('shows optimistic preview immediately', () => {
    // TODO: Test onMutate from TanStack Query
  })

  it('rolls back on upload error', () => {
    // TODO: Test onError handling
  })

  it('allows reordering images', () => {
    // TODO: Test drag-to-reorder state
  })
})
