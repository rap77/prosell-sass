import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/datagrid/StatusBadge'

describe('StatusBadge', () => {
  it('renders Published status with green color and CheckCircle2 icon', () => {
    render(<StatusBadge status="published" />)

    const badge = screen.getByText('Published')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')

    // Verify icon is present
    const icon = badge.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('renders all 7 status states correctly', () => {
    const statuses = [
      { status: 'published', label: 'Published' },
      { status: 'pending', label: 'Pending' },
      { status: 'failed', label: 'Failed' },
      { status: 'draft', label: 'Draft' },
      { status: 'expired', label: 'Expired' },
      { status: 'online', label: 'Online' },
      { status: 'sold', label: 'Sold' },
    ] as const

    statuses.forEach(({ status, label }) => {
      const { container } = render(<StatusBadge status={status} />)
      const badge = screen.getByText(label)

      expect(badge).toBeInTheDocument()

      // Verify icon exists for accessibility
      const badgeWrapper = badge.parentElement
      const icon = badgeWrapper?.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  it('includes icon and text for accessibility (colorblind users)', () => {
    render(<StatusBadge status="published" />)

    // Icon should be present (aria-hidden SVG)
    const icon = screen.getByText('Published').parentElement?.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('aria-hidden', 'true')

    // Screen reader text should include status
    const srText = screen.getByText('published:', { selector: '.sr-only' })
    expect(srText).toBeInTheDocument()

    // Visible label should be present
    const label = screen.getByText('Published')
    expect(label).toBeInTheDocument()
  })

  it('applies correct rounded-full styling', () => {
    const { container } = render(<StatusBadge status="published" />)

    const badge = container.querySelector('span')
    expect(badge?.className).toContain('rounded-full')
    expect(badge?.className).toContain('inline-flex')
  })
})
