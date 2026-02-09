import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for Radix UI (chadcn/ui components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver for Radix UI
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
