import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterPills } from '@/components/filters/FilterPills'

// Mock useVehicleFilters hook
const mockClearAllFilters = vi.fn()
const mockSetFilter = vi.fn()

vi.mock('@/lib/hooks/useVehicleFilters', () => ({
  useVehicleFilters: () => ({
    filters: {
      brand: ['Toyota', 'Honda'],
      status: ['published'],
      search: 'camry',
      priceRange: [10000, 50000],
      year: [2015, 2022],
    },
    setFilter: mockSetFilter,
    clearAllFilters: mockClearAllFilters,
  }),
}))

describe('FilterPills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays active filters as removable pills', () => {
    render(<FilterPills />)

    expect(screen.getByText('Brand: Toyota')).toBeInTheDocument()
    expect(screen.getByText('Brand: Honda')).toBeInTheDocument()
    expect(screen.getByText('Status: published')).toBeInTheDocument()
  })

  it('displays search filter pill', () => {
    render(<FilterPills />)

    expect(screen.getByText('Search: "camry"')).toBeInTheDocument()
  })

  it('displays price range filter pill', () => {
    render(<FilterPills />)

    expect(screen.getByText('$10,000 - $50,000')).toBeInTheDocument()
  })

  it('displays year range filter pill', () => {
    render(<FilterPills />)

    expect(screen.getByText('2015 - 2022')).toBeInTheDocument()
  })

  it('shows count of active filters', () => {
    render(<FilterPills />)

    expect(screen.getByText(/Active filters \(\d+\)/)).toBeInTheDocument()
  })

  it('renders "Clear all" button when filters are active', () => {
    render(<FilterPills />)

    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('clears individual brand filter on pill click', async () => {
    const user = userEvent.setup()
    render(<FilterPills />)

    const toyotaPill = screen.getByText('Brand: Toyota').closest('button')
    await user.click(toyotaPill!)

    expect(mockSetFilter).toHaveBeenCalled()
  })

  it('clears all filters with "Clear all" button', async () => {
    const user = userEvent.setup()
    render(<FilterPills />)

    const clearAllButton = screen.getByText('Clear all')
    await user.click(clearAllButton)

    expect(mockClearAllFilters).toHaveBeenCalled()
  })

  it('has remove icon (X) on each pill', () => {
    render(<FilterPills />)

    // Check for SVG icons (X from lucide-react)
    const icons = screen.getAllByTestId('lucide-x')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('has proper styling (secondary variant, small size)', () => {
    render(<FilterPills />)

    const pill = screen.getByText('Brand: Toyota').closest('button')

    expect(pill).toHaveClass('h-7', 'px-2', 'text-xs')
  })
})
