import React from 'react'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Radix UI DropdownMenu components globally
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild, ...props }: unknown) => {
    // When asChild=true, Radix merges the trigger element with the child (no wrapper)
    // When asChild=false, it wraps children in a button
    if (asChild) {
      // Clone child and add data-testid for testing
      return React.cloneElement(children as React.ReactElement, {
        'data-testid': 'dropdown-trigger',
      } as unknown)
    }
    return <button data-testid="dropdown-trigger" {...props}>{children}</button>
  },
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content" role="menu">{children}</div>,
  DropdownMenuItem: ({ children, onClick, className }: unknown) => (
    <button
      data-testid="dropdown-item"
      className={className}
      onClick={onClick}
      role="menuitem"
    >
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}))

// Mock cmdk (Command Palette) components globally
vi.mock('cmdk', () => ({
  CommandDialog: ({ children, open, onOpenChange }: unknown) => (
    <div data-testid="command-dialog" data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  CommandInput: ({ value, onValueChange, ...props }: unknown) => (
    <input
      data-testid="command-input"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      {...props}
    />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => <div data-testid="command-list">{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ children, heading }: unknown) => (
    <div data-testid="command-group">
      {heading && <div data-testid="command-group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect, ...props }: unknown) => (
    <div
      data-testid="command-item"
      onClick={onSelect}
      {...props}
    >
      {children}
    </div>
  ),
}))

// Mock IntersectionObserver
// @ts-expect-error - Mocking browser API for jsdom environment
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as unknown as IntersectionObserver

// Mock ResizeObserver
// @ts-expect-error - Mocking browser API for jsdom environment
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as ResizeObserver

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})
