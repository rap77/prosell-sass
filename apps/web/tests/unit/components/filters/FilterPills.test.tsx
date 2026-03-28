import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterPills } from '@/components/filters/FilterPills'

// Mock Next.js router and searchParams
const mockPush = vi.fn()
const mockSearchParams = new URLSearchParams('?brand=Toyota,Honda&status=published&search=camry&minPrice=10000&maxPrice=50000&minYear=2015&maxYear=2022')

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key),
    toString: () => mockSearchParams.toString(),
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('FilterPills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset URLSearchParams to default state
    for (const key of Array.from(mockSearchParams.keys())) {
      mockSearchParams.delete(key)
    }
    mockSearchParams.set('brand', 'Toyota,Honda')
    mockSearchParams.set('status', 'published')
    mockSearchParams.set('search', 'camry')
    mockSearchParams.set('minPrice', '10000')
    mockSearchParams.set('maxPrice', '50000')
    mockSearchParams.set('minYear', '2015')
    mockSearchParams.set('maxYear', '2022')
  })

  it('displays active filters as removable pills', () => {
    mockSearchParams.set('brand', 'Toyota,Honda')
    mockSearchParams.set('status', 'published')

    render(<FilterPills />)

    expect(screen.getByText('Brand: Toyota')).toBeInTheDocument()
    expect(screen.getByText('Brand: Honda')).toBeInTheDocument()
    expect(screen.getByText('Status: published')).toBeInTheDocument()
  })

  it('displays search filter pill', () => {
    mockSearchParams.set('search', 'camry')

    render(<FilterPills />)

    expect(screen.getByText('Search: "camry"')).toBeInTheDocument()
  })

  it('displays price range filter pill', () => {
    mockSearchParams.set('minPrice', '10000')
    mockSearchParams.set('maxPrice', '50000')

    render(<FilterPills />)

    expect(screen.getByText('$10,000 - $50,000')).toBeInTheDocument()
  })

  it('displays year range filter pill', () => {
    mockSearchParams.set('minYear', '2015')
    mockSearchParams.set('maxYear', '2022')

    render(<FilterPills />)

    expect(screen.getByText('2015 - 2022')).toBeInTheDocument()
  })

  it('shows count of active filters', () => {
    mockSearchParams.set('brand', 'Toyota,Honda')
    mockSearchParams.set('status', 'published')

    render(<FilterPills />)

    expect(screen.getByText(/Active filters \(3\)/)).toBeInTheDocument()
  })

  it('renders "Clear all" button when filters are active', () => {
    mockSearchParams.set('brand', 'Toyota')

    render(<FilterPills />)

    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('clears individual brand filter on pill click', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('brand', 'Toyota,Honda')

    render(<FilterPills />)

    const toyotaPill = screen.getByText('Brand: Toyota').closest('button')
    await user.click(toyotaPill!)

    expect(mockPush).toHaveBeenCalled()
  })

  it('clears individual status filter on pill click', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('status', 'published')

    render(<FilterPills />)

    const statusPill = screen.getByText('Status: published').closest('button')
    await user.click(statusPill!)

    expect(mockPush).toHaveBeenCalled()
  })

  it('clears search filter on pill click', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('search', 'camry')

    render(<FilterPills />)

    const searchPill = screen.getByText('Search: "camry"').closest('button')
    await user.click(searchPill!)

    expect(mockPush).toHaveBeenCalled()
  })

  it('clears price range filter on pill click', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('minPrice', '10000')
    mockSearchParams.set('maxPrice', '50000')

    render(<FilterPills />)

    const pricePill = screen.getByText('$10,000 - $50,000').closest('button')
    await user.click(pricePill!)

    expect(mockPush).toHaveBeenCalled()
  })

  it('clears year range filter on pill click', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('minYear', '2015')
    mockSearchParams.set('maxYear', '2022')

    render(<FilterPills />)

    const yearPill = screen.getByText('2015 - 2022').closest('button')
    await user.click(yearPill!)

    expect(mockPush).toHaveBeenCalled()
  })

  it('clears all filters with "Clear all" button', async () => {
    const user = userEvent.setup()
    mockSearchParams.set('brand', 'Toyota')
    mockSearchParams.set('status', 'published')

    render(<FilterPills />)

    const clearAllButton = screen.getByText('Clear all')
    await user.click(clearAllButton)

    expect(mockPush).toHaveBeenCalledWith('/catalog', { scroll: false })
  })

  it('renders null when no active filters', () => {
    mockSearchParams.clear()

    const { container } = render(<FilterPills />)

    expect(container.firstChild).toBeNull()
  })

  it('has remove icon (X) on each pill', () => {
    mockSearchParams.set('brand', 'Toyota')

    const { container } = render(<FilterPills />)

    // Check for SVG icons (X from lucide-react)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('has proper styling (secondary variant, small size)', () => {
    mockSearchParams.set('brand', 'Toyota')

    const pill = screen.getByText('Brand: Toyota').closest('button')

    expect(pill).toHaveClass('h-7', 'px-2', 'text-xs')
  })
})
