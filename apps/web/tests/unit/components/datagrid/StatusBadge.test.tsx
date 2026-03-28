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
      { status: 'published', label: 'Published', class: 'bg-green-100' },
      { status: 'pending', label: 'Pending', class: 'bg-yellow-100' },
      { status: 'failed', label: 'Failed', class: 'bg-red-100' },
      { status: 'draft', label: 'Draft', class: 'bg-gray-100' },
      { status: 'expired', label: 'Expired', class: 'bg-gray-100' },
      { status: 'online', label: 'Online', class: 'bg-blue-100' },
      { status: 'sold', label: 'Sold', class: 'bg-purple-100' },
    ] as const

    statuses.forEach(({ status, label, class: className }) => {
      const { container } = render(<StatusBadge status={status} />)
      const badge = screen.getByText(label)

      expect(badge).toBeInTheDocument()

      // Check that the badge wrapper has the correct color class
      const badgeWrapper = badge.parentElement
      expect(badgeWrapper?.className).toContain(className)

      // Verify icon exists for accessibility
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
