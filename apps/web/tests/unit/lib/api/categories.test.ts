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

  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
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
        attribute_schema: { year: true, make: true, model: true },
        is_active: true,
        created_at: "2026-04-26T00:00:00Z",
        updated_at: "2026-04-26T00:00:00Z",
      },
      {
        id: "cat-2",
        name: "SUVs",
        slug: "suvs",
        attribute_schema: { year: true, make: true, model: true, drivetrain: true },
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
        page: 1,
        page_size: 10,
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
      })
    );
  });

  it("should cache categories for 5 minutes (staleTime)", async () => {
    const mockCategories: Category[] = [
      {
        id: "cat-1",
        name: "Sedans",
        slug: "sedans",
        attribute_schema: { year: true },
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
        page: 1,
        page_size: 10,
      }),
    });

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify only one fetch call was made (data is cached)
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify staleTime is configured correctly by checking isStale flag
    // Immediately after fetch, data should not be stale (cached for 5min)
    expect(result.current.isStale).toBe(false);
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
      })
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
        attribute_schema: { year: true },
        is_active: true,
        created_at: "2026-04-26T00:00:00Z",
        updated_at: "2026-04-26T00:00:00Z",
      },
      {
        id: "cat-2",
        name: "SUVs",
        slug: "suvs",
        attribute_schema: { year: true },
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
        page: 1,
        page_size: 10,
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

  it("should memoize transformed options", async () => {
    const mockCategories: Category[] = [
      {
        id: "cat-1",
        name: "Sedans",
        slug: "sedans",
        attribute_schema: { year: true },
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
        page: 1,
        page_size: 10,
      }),
    });

    const { result, rerender } = renderHook(() => useCategoryOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const firstData = result.current.data;

    // Trigger re-render
    rerender();

    const secondData = result.current.data;

    // Reference equality means memoization worked
    expect(firstData).toBe(secondData);
  });
});
