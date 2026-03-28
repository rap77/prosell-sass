import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/layout/Sidebar'

// Mock Next.js usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/catalog',
}))

// Mock Zustand store
vi.mock('@/lib/stores/layoutStore', () => ({
  useLayoutStore: vi.fn(() => ({
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
  })),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders navigation groups (Inventario, Ventas, Configuración)', () => {
    render(<Sidebar groups={['inventario', 'ventas', 'configuración']} />)

    expect(screen.getByText('Inventario')).toBeInTheDocument()
    expect(screen.getByText('Ventas')).toBeInTheDocument()
    expect(screen.getByText('Configuración')).toBeInTheDocument()
  })

  it('filters navigation by user role (seller excludes Configuración)', () => {
    render(<Sidebar groups={['inventario', 'ventas']} />)

    expect(screen.getByText('Inventario')).toBeInTheDocument()
    expect(screen.getByText('Ventas')).toBeInTheDocument()
    expect(screen.queryByText('Configuración')).not.toBeInTheDocument()
  })

  it('shows only Inventario group for limited role', () => {
    render(<Sidebar groups={['inventario']} />)

    expect(screen.getByText('Inventario')).toBeInTheDocument()
    expect(screen.queryByText('Ventas')).not.toBeInTheDocument()
    expect(screen.queryByText('Configuración')).not.toBeInTheDocument()
  })

  it('renders navigation items within groups', () => {
    render(<Sidebar groups={['inventario']} />)

    expect(screen.getByText('Catálogo')).toBeInTheDocument()
    expect(screen.getByText('Publicaciones')).toBeInTheDocument()
  })

  it('uses corrected Spanish terminology (not Operations/Growth)', () => {
    const { container } = render(<Sidebar groups={['inventario', 'ventas', 'configuración']} />)

    // Verify correct terms are present (Configuración appears twice: as group header and as nav item)
    expect(screen.getAllByText('Inventario').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ventas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Configuración').length).toBeGreaterThan(0)

    // Verify incorrect terms are NOT present
    expect(screen.queryByText('Operations')).not.toBeInTheDocument()
    expect(screen.queryByText('Growth')).not.toBeInTheDocument()
    expect(screen.queryByText('System')).not.toBeInTheDocument()
  })

  it('highlights active route', () => {
    render(<Sidebar groups={['inventario']} />)

    const catalogLink = screen.getByText('Catálogo').closest('a')
    expect(catalogLink).toHaveClass('bg-accent', 'text-accent-foreground')
  })

  it('renders collapse toggle button', () => {
    render(<Sidebar groups={['inventario']} />)

    const toggleButton = screen.getByLabelText(/collapse sidebar/i)
    expect(toggleButton).toBeInTheDocument()
  })

  it('renders footer with user info', () => {
    render(<Sidebar groups={['inventario']} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Seller')).toBeInTheDocument()
  })

  it('renders ProSell logo when expanded', () => {
    render(<Sidebar groups={['inventario']} />)

    expect(screen.getByText('ProSell')).toBeInTheDocument()
  })
})
