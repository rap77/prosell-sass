import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
/**
 * Unit tests for Product API client
 *
 * Tests cover:
 * - Creating products via POST /api/v1/products
 * - Including attributes.vin for auto-vehicle creation
 * - Receiving product response with id and attributes
 * - Error handling with backend messages
 * - Query invalidation after mutation
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateProduct, createProductWithVehicle } from "@/lib/api/products";
import type { CreateProductRequest, Product } from "@/types/product";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to create wrapper with QueryClient (using createElement to avoid JSX in test file)
import { createElement } from "react";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe("createProductWithVehicle", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should send POST request to /api/v1/products", async () => {
    const mockProduct: Product = {
      id: "prod-123",
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      currency: "USD",
      condition: "used",
      attributes: {
        category: "vehicle" as const,
        vin: "2GNALCEK1H1615946",
        year: 2017,
        make: "Toyota",
        model: "Camry",
        mileage: 50000,
      },
      status: "draft",
      is_featured: false,
      view_count: 0,
      favorite_count: 0,
      created_at: "2026-04-26T00:00:00Z",
      updated_at: "2026-04-26T00:00:00Z",
    };

    const requestData: CreateProductRequest = {
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      currency: "USD",
      condition: "used",
      attributes: {
        category: "vehicle" as const,
        vin: "2GNALCEK1H1615946",
        year: 2017,
        make: "Toyota",
        model: "Camry",
        mileage: 50000,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    });

    const result = await createProductWithVehicle(requestData);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/products",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestData),
      })
    );

    expect(result).toEqual(mockProduct);
  });

  it("should include attributes.vin for auto-vehicle creation", async () => {
    const mockProduct: Product = {
      id: "prod-123",
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      currency: "USD",
      condition: "used",
      attributes: {
        category: "vehicle" as const,
        vin: "2GNALCEK1H1615946", // This triggers backend auto-creation
        year: 2017,
        make: "Toyota",
        model: "Camry",
        mileage: 50000,
      },
      status: "draft",
      is_featured: false,
      view_count: 0,
      favorite_count: 0,
      created_at: "2026-04-26T00:00:00Z",
      updated_at: "2026-04-26T00:00:00Z",
    };

    const requestData: CreateProductRequest = {
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      currency: "USD",
      condition: "used",
      attributes: {
        category: "vehicle" as const,
        vin: "2GNALCEK1H1615946", // VIN present = auto-vehicle creation
        year: 2017,
        make: "Toyota",
        model: "Camry",
        mileage: 50000,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    });

    await createProductWithVehicle(requestData);

    // Verify the request body includes VIN in attributes
    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.attributes.vin).toBe("2GNALCEK1H1615946");
    expect(requestBody).toEqual({
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      currency: "USD",
      condition: "used",
      attributes: expect.objectContaining({
        vin: "2GNALCEK1H1615946",
      }),
    });
  });

  it("should return product with id and attributes from backend", async () => {
    const mockProduct: Product = {
      id: "prod-123",
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      currency: "USD",
      condition: "used",
      attributes: {
        category: "vehicle" as const,
        vin: "2GNALCEK1H1615946",
        year: 2017,
        make: "Toyota",
        model: "Camry",
        trim: "SE",
        mileage: 50000,
      },
      status: "draft",
      is_featured: false,
      view_count: 0,
      favorite_count: 0,
      created_at: "2026-04-26T00:00:00Z",
      updated_at: "2026-04-26T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    });

    const result = await createProductWithVehicle({
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      currency: "USD",
      condition: "used",
      attributes: {
        category: "vehicle" as const,
        vin: "2GNALCEK1H1615946",
        year: 2017,
        make: "Toyota",
        model: "Camry",
        mileage: 50000,
      },
    });

    expect(result.id).toBe("prod-123");
    expect(result.attributes).toEqual(expect.objectContaining({
      vin: "2GNALCEK1H1615946",
      year: 2017,
      make: "Toyota",
      model: "Camry",
      trim: "SE",
    }));
  });

  it("should throw error with backend message on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid VIN format" }),
    });

    await expect(
      createProductWithVehicle({
        title: "Test",
        price_cents: 1000_00,
        tenant_id: "tenant-1",
        organization_id: "org-1",
        category_id: "cat-1",
        attributes: { category: "vehicle" as const, vin: "INVALID", year: 2000, make: "Test", model: "Vehicle", mileage: 0 },
      })
    ).rejects.toThrow("Invalid VIN format");
  });

  it("should throw generic error when JSON parsing fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("Network error");
      },
    });

    await expect(
      createProductWithVehicle({
        title: "Test",
        price_cents: 1000_00,
        tenant_id: "tenant-1",
        organization_id: "org-1",
        category_id: "cat-1",
        attributes: { category: "generic" as const },
      })
    ).rejects.toThrow("Failed to create product");
  });
});

describe("useCreateProduct", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  it("should create product and invalidate queries", async () => {
    const { toast } = await import("sonner");

    const mockProduct: Product = {
      id: "prod-123",
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      currency: "USD",
      condition: "used",
      attributes: {
        category: "vehicle" as const,
        vin: "2GNALCEK1H1615946",
        year: 2017,
        make: "Toyota",
        model: "Camry",
        mileage: 50000,
      },
      status: "draft",
      is_featured: false,
      view_count: 0,
      favorite_count: 0,
      created_at: "2026-04-26T00:00:00Z",
      updated_at: "2026-04-26T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    });

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    // Pre-populate cache to verify invalidation
    await queryClient.prefetchQuery({
      queryKey: ["vehicles"],
      queryFn: async () => [],
    });
    await queryClient.prefetchQuery({
      queryKey: ["products"],
      queryFn: async () => [],
    });

    const { result } = renderHook(() => useCreateProduct(), { wrapper });

    const requestData: CreateProductRequest = {
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      attributes: {
        category: "vehicle" as const,
        vin: "2GNALCEK1H1615946",
        year: 2017,
        make: "Toyota",
        model: "Camry",
        mileage: 50000,
      },
    };

    await result.current.mutateAsync(requestData);

    // Verify queries were invalidated
    await waitFor(() => {
      expect(queryClient.getQueryState(["vehicles"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["products"])?.isInvalidated).toBe(true);
    });

    // Verify success toast was shown
    expect(toast.success).toHaveBeenCalledWith("Product created successfully");
  });

  it("should show error toast on failure", async () => {
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Validation error" }),
    });

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCreateProduct(), { wrapper });

    const requestData: CreateProductRequest = {
      title: "Test",
      price_cents: 1000_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      attributes: { category: "generic" as const },
    };

    await expect(result.current.mutateAsync(requestData)).rejects.toThrow();

    // Verify error toast was shown
    expect(toast.error).toHaveBeenCalledWith("Validation error");
  });

  it("should show generic error toast when backend returns no message", async () => {
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), // No message field
    });

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCreateProduct(), { wrapper });

    const requestData: CreateProductRequest = {
      title: "Test",
      price_cents: 1000_00,
      tenant_id: "tenant-1",
      organization_id: "org-1",
      category_id: "cat-1",
      attributes: { category: "generic" as const },
    };

    await expect(result.current.mutateAsync(requestData)).rejects.toThrow();

    // Verify generic error toast was shown
    expect(toast.error).toHaveBeenCalledWith("Failed to create product");
  });
});
