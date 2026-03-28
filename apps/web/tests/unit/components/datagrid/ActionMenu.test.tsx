import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionMenu } from '@/components/datagrid/ActionMenu'

describe('ActionMenu', () => {
  const mockCallbacks = {
    onPublish: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dropdown menu trigger button', () => {
    render(<ActionMenu vehicleId="123" {...mockCallbacks} />)

    const trigger = screen.getByRole('button', { name: /open menu/i })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveClass('h-8', 'w-8')
  })

  it('opens menu on click and displays all actions', async () => {
    const user = userEvent.setup()
    render(<ActionMenu vehicleId="123" {...mockCallbacks} />)

    const trigger = screen.getByRole('button', { name: /open menu/i })
    await user.click(trigger)

    // Check menu items are visible
    expect(screen.getByText('Publish')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onPublish when Publish is clicked', async () => {
    const user = userEvent.setup()
    render(<ActionMenu vehicleId="123" {...mockCallbacks} />)

    const trigger = screen.getByRole('button', { name: /open menu/i })
    await user.click(trigger)

    const publishButton = screen.getByText('Publish')
    await user.click(publishButton)

    expect(mockCallbacks.onPublish).toHaveBeenCalledTimes(1)
  })

  it('calls onEdit when Edit is clicked', async () => {
    const user = userEvent.setup()
    render(<ActionMenu vehicleId="123" {...mockCallbacks} />)

    const trigger = screen.getByRole('button', { name: /open menu/i })
    await user.click(trigger)

    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    expect(mockCallbacks.onEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when Delete is clicked', async () => {
    const user = userEvent.setup()
    render(<ActionMenu vehicleId="123" {...mockCallbacks} />)

    const trigger = screen.getByRole('button', { name: /open menu/i })
    await user.click(trigger)

    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    expect(mockCallbacks.onDelete).toHaveBeenCalledTimes(1)
  })

  it('applies destructive styling to Delete action', async () => {
    const user = userEvent.setup()
    render(<ActionMenu vehicleId="123" {...mockCallbacks} />)

    const trigger = screen.getByRole('button', { name: /open menu/i })
    await user.click(trigger)

    const deleteButton = screen.getByText('Delete')
    expect(deleteButton).toHaveClass('text-destructive')
  })
})
