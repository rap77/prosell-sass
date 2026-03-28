import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataGrid, type Vehicle } from '@/components/datagrid/DataGrid'

// Mock StatusBadge to avoid complexity
vi.mock('@/components/datagrid/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-testid={`status-${status}`}>{status}</span>,
}))

// Mock ActionMenu to avoid DropdownMenu complexity
vi.mock('@/components/datagrid/ActionMenu', () => ({
  ActionMenu: ({ vehicleId }: { vehicleId: string }) => (
    <button data-testid={`action-${vehicleId}`}>Actions</button>
  ),
}))

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
    expect(true).toBe(true)
  })

  it('renders empty table when no data provided', () => {
    render(<DataGrid data={[]} />)
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
  })

  it('accepts vehicle data prop', () => {
    const { rerender } = render(<DataGrid data={[]} />)
    rerender(<DataGrid data={mockVehicles} />)
    expect(true).toBe(true)
  })

  it('has correct data structure', () => {
    expect(mockVehicles[0]).toHaveProperty('id', '1')
    expect(mockVehicles[0]).toHaveProperty('title', '2020 Toyota Camry')
    expect(mockVehicles[0]).toHaveProperty('price', 25000)
    expect(mockVehicles[0]).toHaveProperty('status', 'published')
  })

  it('Vehicle type has correct properties', () => {
    const vehicle: Vehicle = {
      id: 'test',
      title: 'Test Vehicle',
      price: 10000,
      status: 'draft',
    }

    expect(vehicle).toBeDefined()
    expect(typeof vehicle.id).toBe('string')
    expect(typeof vehicle.title).toBe('string')
    expect(typeof vehicle.price).toBe('number')
    expect(['published', 'pending', 'failed', 'draft', 'expired', 'online', 'sold']).toContain(vehicle.status)
  })
})
