import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDataGrid } from '@/lib/hooks/useDataGrid'

describe('useDataGrid', () => {
  beforeEach(() => {
    // Reset hook state before each test
    vi.clearAllMocks()
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useDataGrid())

    expect(result.current.sorting).toEqual([])
    expect(result.current.globalFilter).toBe('')
    expect(result.current.rowSelection).toEqual({})
    expect(result.current.columnFilters).toEqual([])
  })

  it('updates sorting state', () => {
    const { result } = renderHook(() => useDataGrid())

    act(() => {
      result.current.setSorting([{ id: 'price', desc: true }])
    })

    expect(result.current.sorting).toEqual([{ id: 'price', desc: true }])
  })

  it('manages row selection map', () => {
    const { result } = renderHook(() => useDataGrid())

    act(() => {
      result.current.setRowSelection({ '1': true, '2': true })
    })

    expect(result.current.rowSelection).toEqual({
      '1': true,
      '2': true,
    })
  })

  it('handles global filter input', () => {
    const { result } = renderHook(() => useDataGrid())

    act(() => {
      result.current.setGlobalFilter('camry')
    })

    expect(result.current.globalFilter).toBe('camry')
  })

  it('handles column filters', () => {
    const { result } = renderHook(() => useDataGrid())

    act(() => {
      result.current.setColumnFilters([{ id: 'brand', value: 'Toyota' }])
    })

    expect(result.current.columnFilters).toEqual([
      { id: 'brand', value: 'Toyota' },
    ])
  })

  it('allows clearing row selection', () => {
    const { result } = renderHook(() => useDataGrid())

    act(() => {
      result.current.setRowSelection({ '1': true, '2': true })
    })

    expect(result.current.rowSelection).toEqual({
      '1': true,
      '2': true,
    })

    act(() => {
      result.current.setRowSelection({})
    })

    expect(result.current.rowSelection).toEqual({})
  })

  it('allows clearing sorting', () => {
    const { result } = renderHook(() => useDataGrid())

    act(() => {
      result.current.setSorting([{ id: 'price', desc: true }])
    })

    expect(result.current.sorting).toEqual([{ id: 'price', desc: true }])

    act(() => {
      result.current.setSorting([])
    })

    expect(result.current.sorting).toEqual([])
  })

  it('allows clearing global filter', () => {
    const { result } = renderHook(() => useDataGrid())

    act(() => {
      result.current.setGlobalFilter('search term')
    })

    expect(result.current.globalFilter).toBe('search term')

    act(() => {
      result.current.setGlobalFilter('')
    })

    expect(result.current.globalFilter).toBe('')
  })

  it('maintains state across re-renders', () => {
    const { result, rerender } = renderHook(() => useDataGrid())

    act(() => {
      result.current.setSorting([{ id: 'price', desc: true }])
      result.current.setRowSelection({ '1': true })
    })

    rerender()

    expect(result.current.sorting).toEqual([{ id: 'price', desc: true }])
    expect(result.current.rowSelection).toEqual({ '1': true })
  })
})
