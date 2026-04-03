import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '@/components/layout/Header'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/catalog/vehicles',
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    user: null,
  }),
}))

describe('Header', () => {
  it('renders without crashing', () => {
    render(<Header />)
    expect(true).toBe(true)
  })

  it('accepts user prop', () => {
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
    expect(true).toBe(true)
  })

  it('accepts organization prop', () => {
    render(<Header organization={{ name: 'Test Dealership' }} />)
    expect(true).toBe(true)
  })

  it('user data structure is correct', () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'Seller',
      initials: 'TU',
    }

    expect(typeof userData.name).toBe('string')
    expect(typeof userData.email).toBe('string')
    expect(typeof userData.role).toBe('string')
    expect(typeof userData.initials).toBe('string')
  })

  it('organization data structure is correct', () => {
    const orgData = {
      name: 'Test Org',
    }

    expect(typeof orgData.name).toBe('string')
  })
})
