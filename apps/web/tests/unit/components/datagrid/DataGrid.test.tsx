import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataGrid, type Vehicle } from '@/components/datagrid/DataGrid'

describe('DataGrid', () => {
  const mockVehicles: Vehicle[] = [
    {
      id: '1',
      title: '2020 Toyota Camry',
      price: 25000,
      status: 'published',
      photo_url: 'https://example.com/photo1.jpg',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
    },
    {
      id: '2',
      title: '2021 Honda Accord',
      price: 28000,
      status: 'pending',
      photo_url: 'https://example.com/photo2.jpg',
      year: 2021,
      make: 'Honda',
      model: 'Accord',
    },
  ]

  it('renders without crashing', () => {
    render(<DataGrid data={[]} />)

    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
  })

  it('renders empty table when no data provided', () => {
    render(<DataGrid data={[]} />)

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('rowgroup')

    expect(rows).toHaveLength(1) // Only tbody
  })

  it('displays vehicle data correctly in rows', () => {
    render(<DataGrid data={mockVehicles} />)

    // Check vehicle titles
    expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument()
    expect(screen.getByText('2021 Honda Accord')).toBeInTheDocument()

    // Check prices
    expect(screen.getByText('$25,000.00')).toBeInTheDocument()
    expect(screen.getByText('$28,000.00')).toBeInTheDocument()
  })

  it('renders photo thumbnails or placeholder', () => {
    render(<DataGrid data={mockVehicles} />)

    const images = screen.getAllByRole('img')
    expect(images[0]).toHaveAttribute('src', 'https://example.com/photo1.jpg')
    expect(images[1]).toHaveAttribute('src', 'https://example.com/photo2.jpg')
  })

  it('shows "No photo" placeholder when photo_url is missing', () => {
    const vehiclesWithoutPhoto: Vehicle[] = [
      {
        id: '3',
        title: 'Vehicle without photo',
        price: 15000,
        status: 'draft',
      },
    ]

    render(<DataGrid data={vehiclesWithoutPhoto} />)

    expect(screen.getByText('No photo')).toBeInTheDocument()
  })

  it('renders status badges for each vehicle', () => {
    render(<DataGrid data={mockVehicles} />)

    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders select-all checkbox in header', () => {
    render(<DataGrid data={mockVehicles} />)

    const selectAllCheckbox = screen.getByLabelText('Select all')
    expect(selectAllCheckbox).toBeInTheDocument()
  })

  it('renders individual row checkboxes', () => {
    render(<DataGrid data={mockVehicles} />)

    const row1Checkbox = screen.getByLabelText('Select row 1')
    const row2Checkbox = screen.getByLabelText('Select row 2')

    expect(row1Checkbox).toBeInTheDocument()
    expect(row2Checkbox).toBeInTheDocument()
  })

  it('renders action menu for each row', () => {
    render(<DataGrid data={mockVehicles} />)

    // Should have 2 action menu buttons (one per row)
    const menuButtons = screen.getAllByLabelText('Open menu')
    expect(menuButtons).toHaveLength(2)
  })

  it('applies hover state to rows', () => {
    const { container } = render(<DataGrid data={mockVehicles} />)

    const rows = container.querySelectorAll('tbody tr')
    rows.forEach((row) => {
      expect(row).toHaveClass('hover:bg-muted/50')
    })
  })

  it('has sticky header for scroll performance', () => {
    const { container } = render(<DataGrid data={mockVehicles} />)

    const thead = container.querySelector('thead')
    expect(thead).toHaveClass('sticky', 'top-0', 'z-10')
  })

  it('constrains height to 600px with overflow scroll', () => {
    const { container } = render(<DataGrid data={mockVehicles} />)

    const scrollContainer = container.querySelector('.h-\\[600px\\]')
    expect(scrollContainer).toHaveClass('overflow-auto')
  })

  it('formats prices as USD currency', () => {
    render(<DataGrid data={mockVehicles} />)

    // Verify Intl.NumberFormat is being used
    expect(screen.getByText('$25,000.00')).toBeInTheDocument()
    expect(screen.getByText('$28,000.00')).toBeInTheDocument()
  })
})
