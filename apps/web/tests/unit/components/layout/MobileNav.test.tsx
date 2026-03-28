import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MobileNav } from '@/components/layout/MobileNav'

// Mock Next.js usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/catalog',
}))

describe('MobileNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 4 bottom navigation icons', () => {
    render(<MobileNav />)

    expect(screen.getByText('Catálogo')).toBeInTheDocument()
    expect(screen.getByText('Publicar')).toBeInTheDocument()
    expect(screen.getByText('Leads')).toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()
  })

  it('has 44x44px touch targets (Fitts\'s Law)', () => {
    const { container } = render(<MobileNav />)

    // Check button dimensions (h-12 w-12 = 48px, which exceeds 44px minimum)
    const buttons = container.querySelectorAll('button')
    buttons.forEach((button) => {
      expect(button).toHaveClass('h-12', 'w-12')
    })
  })

  it('highlights active route', () => {
    render(<MobileNav />)

    const catalogButton = screen.getByLabelText('Catálogo')
    expect(catalogButton).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('does not highlight inactive routes', () => {
    render(<MobileNav />)

    const publishButton = screen.getByLabelText('Publicar')
    expect(publishButton).toHaveClass('text-muted-foreground')
  })

  it('is fixed at bottom of viewport', () => {
    const { container } = render(<MobileNav />)

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('fixed', 'bottom-0')
  })

  it('has z-index for overlay', () => {
    const { container } = render(<MobileNav />)

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('z-50')
  })

  it('has border-top styling', () => {
    const { container } = render(<MobileNav />)

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('border-t')
  })

  it('has correct height (h-16 = 64px)', () => {
    const { container } = render(<MobileNav />)

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('h-16')
  })

  it('is hidden on desktop (md:hidden)', () => {
    const { container } = render(<MobileNav />)

    const nav = container.querySelector('nav')
    expect(nav).toHaveClass('md:hidden')
  })

  it('has aria-current="page" on active route', () => {
    render(<MobileNav />)

    const catalogButton = screen.getByLabelText('Catálogo')
    expect(catalogButton).toHaveAttribute('aria-current', 'page')
  })

  it('has proper aria-label for accessibility', () => {
    render(<MobileNav />)

    expect(screen.getByLabelText('Catálogo')).toBeInTheDocument()
    expect(screen.getByLabelText('Publicar')).toBeInTheDocument()
    expect(screen.getByLabelText('Leads')).toBeInTheDocument()
    expect(screen.getByLabelText('Más')).toBeInTheDocument()
  })
})
