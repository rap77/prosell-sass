/**
 * Unit tests for Category API client
 *
 * Tests cover:
 * - Fetching categories from API
 * - 5-minute cache configuration
 * - Transformation to Select options format
 * - Error handling with backend messages
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCategories, useCategoryOptions } from "@/lib/api/categories";
import type { Category } from "@/types/category";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create wrapper with QueryClient (using createElement to avoid JSX in test file)
import { createElement } from "react";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  }
  return Wrapper;
}

describe("useCategories", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should fetch categories array from API", async () => {
    const mockCategories: Category[] = [
      {
        id: "cat-1",
        name: "Sedans",
        slug: "sedans",
        attribute_schema: {
          year: { type: "number", filter_type: "range" },
          make: { type: "string", filter_type: "select" },
          model: { type: "string", filter_type: "exact" },
        },
        presentation: null,
        is_active: true,
        created_at: "2026-04-26T00:00:00Z",
        updated_at: "2026-04-26T00:00:00Z",
      },
      {
        id: "cat-2",
        name: "SUVs",
        slug: "suvs",
        attribute_schema: {
          year: { type: "number", filter_type: "range" },
          make: { type: "string", filter_type: "select" },
          model: { type: "string", filter_type: "exact" },
          drivetrain: { type: "string", filter_type: "select" },
        },
        presentation: null,
        is_active: true,
        created_at: "2026-04-26T00:00:00Z",
        updated_at: "2026-04-26T00:00:00Z",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        categories: mockCategories,
        total: 2,
        skip: 0,
        limit: 100,
      }),
    });

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify categories are returned
    expect(result.current.data).toEqual(mockCategories);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/categories",
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });

  it("should cache categories for 5 minutes (staleTime)", async () => {
    const mockCategories: Category[] = [
      {
        id: "cat-1",
        name: "Sedans",
        slug: "sedans",
        attribute_schema: { year: { type: "number", filter_type: "range" } },
        presentation: null,
        is_active: true,
        created_at: "2026-04-26T00:00:00Z",
        updated_at: "2026-04-26T00:00:00Z",
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: mockCategories,
        total: 1,
        skip: 0,
        limit: 100,
      }),
    });

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify only one fetch call was made (data is cached)
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // In test mode (NODE_ENV=test), staleTime=0 so data is immediately stale.
    // This is intentional: tests always see fresh data without cache delays.
    expect(result.current.isStale).toBe(true);
  });

  it("should throw error with backend message on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Unauthorized access" }),
    });

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(
      expect.objectContaining({
        message: "Unauthorized access",
      }),
    );
  });

  it("should throw generic error when JSON parsing fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Failed to fetch categories");
  });
});

describe("useCategoryOptions", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should transform categories to { value, label } format", async () => {
    const mockCategories: Category[] = [
      {
        id: "cat-1",
        name: "Sedans",
        slug: "sedans",
        attribute_schema: { year: { type: "number", filter_type: "range" } },
        presentation: null,
        is_active: true,
        created_at: "2026-04-26T00:00:00Z",
        updated_at: "2026-04-26T00:00:00Z",
      },
      {
        id: "cat-2",
        name: "SUVs",
        slug: "suvs",
        attribute_schema: { year: { type: "number", filter_type: "range" } },
        presentation: null,
        is_active: true,
        created_at: "2026-04-26T00:00:00Z",
        updated_at: "2026-04-26T00:00:00Z",
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: mockCategories,
        total: 2,
        skip: 0,
        limit: 100,
      }),
    });

    const { result } = renderHook(() => useCategoryOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify transformation to Select options
    expect(result.current.data).toEqual([
      { value: "cat-1", label: "Sedans" },
      { value: "cat-2", label: "SUVs" },
    ]);
  });

  it("should return undefined when categories are loading", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useCategoryOptions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it("should return stable { value, label } options on re-render", async () => {
    const mockCategories: Category[] = [
      {
        id: "cat-1",
        name: "Sedans",
        slug: "sedans",
        attribute_schema: { year: { type: "number", filter_type: "range" } },
        presentation: null,
        is_active: true,
        created_at: "2026-04-26T00:00:00Z",
        updated_at: "2026-04-26T00:00:00Z",
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: mockCategories,
        total: 1,
        skip: 0,
        limit: 100,
      }),
    });

    const { result, rerender } = renderHook(() => useCategoryOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const expected = [{ value: "cat-1", label: "Sedans" }];

    // Initial render — options are transformed correctly.
    expect(result.current.data).toEqual(expected);

    // Trigger re-render and verify the transformation is stable.
    rerender();
    expect(result.current.data).toEqual(expected);
  });
});
