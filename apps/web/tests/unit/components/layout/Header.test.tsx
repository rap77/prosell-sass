import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '@/components/layout/Header'

// Mock Next.js usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/catalog/vehicles',
}))

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input with placeholder', () => {
    render(<Header />)

    const searchInput = screen.getByPlaceholderText(/search/i)
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('type', 'search')
  })

  it('displays keyboard shortcut hint (Cmd+K)', () => {
    render(<Header />)

    const kbdHint = screen.getByText('⌘K')
    expect(kbdHint).toBeInTheDocument()
  })

  it('displays breadcrumbs from pathname', () => {
    render(<Header />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Catalog')).toBeInTheDocument()
    expect(screen.getByText('Vehicles')).toBeInTheDocument()
  })

  it('highlights last breadcrumb as current page', () => {
    render(<Header />)

    const breadcrumbs = screen.getAllByText(/catalog|vehicles/i)
    const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1]

    expect(currentBreadcrumb).toHaveClass('font-medium', 'text-foreground')
  })

  it('shows user menu with initials avatar', () => {
    render(<Header />)

    const userButton = screen.getByText('JD')
    expect(userButton).toBeInTheDocument()
  })

  it('displays user name and role in menu trigger', () => {
    const { container } = render(<Header />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Seller')).toBeInTheDocument()
  })

  it('renders org switcher button', () => {
    render(<Header />)

    const orgButton = screen.getByText('ProSell Dealership')
    expect(orgButton).toBeInTheDocument()
  })

  it('renders org switcher placeholder (Phase 5 feature)', () => {
    render(<Header />)

    const orgButton = screen.getByText('ProSell Dealership')
    expect(orgButton).toBeInTheDocument()

    // Should have Building2 icon
    const orgIcon = orgButton.parentElement?.querySelector('svg')
    expect(orgIcon).toBeInTheDocument()
  })

  it('uses provided user data when available', () => {
    render(
      <Header
        user={{
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'Admin',
          initials: 'JS',
        }}
      />
    )

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('JS')).toBeInTheDocument()
  })

  it('uses provided organization data when available', () => {
    render(<Header organization={{ name: 'Test Dealership' }} />)

    expect(screen.getByText('Test Dealership')).toBeInTheDocument()
  })

  it('is sticky at top of page', () => {
    const { container } = render(<Header />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('sticky', 'top-0', 'z-30')
  })

  it('has border-bottom styling', () => {
    const { container } = render(<Header />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('border-b')
  })
})
