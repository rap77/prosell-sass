/**
 * TDD: Categories API Client Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCategories, useCategoryOptions } from "@/lib/api/categories";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
};

describe("Categories API Client - useCategories", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should fetch categories from API", async () => {
    const mockCategories = {
      categories: [
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
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "cat-2",
          name: "SUVs",
          slug: "suvs",
          attribute_schema: {
            year: { type: "number", filter_type: "range" },
            make: { type: "string", filter_type: "select" },
            model: { type: "string", filter_type: "exact" },
            trim: { type: "string", filter_type: "exact" },
          },
          presentation: null,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
      total: 2,
      skip: 0,
      limit: 100,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    } as Response);

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/categories", {
      credentials: "include",
    });
    expect(result.current.data).toEqual(mockCategories.categories);
    expect(result.current.data?.length).toBe(2);
  });

  it("should cache categories for 5 minutes (staleTime)", async () => {
    const mockCategories = {
      categories: [
        {
          id: "cat-1",
          name: "Sedans",
          slug: "sedans",
          attribute_schema: { year: { type: "number", filter_type: "range" } },
          presentation: null,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
      skip: 0,
      limit: 100,
    };

    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => mockCategories,
      } as Response;
    });

    const { result, rerender } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    // Wait for first fetch
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(callCount).toBe(1);

    // Rerender should use cache (no new fetch)
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(callCount).toBe(1); // Still 1, not 2
  });

  it("should throw error with message from backend on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: "Database connection failed" }),
    } as Response);

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(
      new Error("Database connection failed"),
    );
  });

  it("should handle network errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error("Network error"));
  });

  it("should return loading state while fetching", () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  categories: [],
                  total: 0,
                  skip: 0,
                  limit: 100,
                }),
              } as Response),
            100,
          ),
        ),
    );

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
  });
});

describe("Categories API Client - useCategoryOptions", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should transform categories to { value, label } format", async () => {
    const mockCategories = {
      categories: [
        {
          id: "cat-1",
          name: "Sedans",
          slug: "sedans",
          attribute_schema: { year: { type: "number", filter_type: "range" } },
          presentation: null,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "cat-2",
          name: "SUVs",
          slug: "suvs",
          attribute_schema: { year: { type: "number", filter_type: "range" } },
          presentation: null,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
      total: 2,
      skip: 0,
      limit: 100,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    } as Response);

    const { result } = renderHook(() => useCategoryOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { value: "cat-1", label: "Sedans" },
      { value: "cat-2", label: "SUVs" },
    ]);
  });

  it("should return stable { value, label } options on re-render", async () => {
    const mockCategories = {
      categories: [
        {
          id: "cat-1",
          name: "Sedans",
          slug: "sedans",
          attribute_schema: { year: { type: "number", filter_type: "range" } },
          presentation: null,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
      skip: 0,
      limit: 100,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    } as Response);

    const { result, rerender } = renderHook(() => useCategoryOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const expected = [{ value: "cat-1", label: "Sedans" }];

    // Initial render — options are transformed correctly.
    expect(result.current.data).toEqual(expected);

    // Re-render — transformation is stable.
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(expected);
  });

  it("should preserve loading and error states from useCategories", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: "Server error" }),
    } as Response);

    const { result } = renderHook(() => useCategoryOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(new Error("Server error"));
  });
});
