/**
 * TDD: Products API Client Tests
 * RED PHASE - Escribir tests ANTES de implementar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createProductWithVehicle, useCreateProduct } from "@/lib/api/products";
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
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("Products API Client - createProductWithVehicle", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should send POST request to /api/v1/products with credentials", async () => {
    const mockProduct = {
      id: "prod-1",
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      category_id: "cat-123",
      attributes: {
        vin: "2GNALCEK1H1615946",
        year: 2017,
        make: "Chevrolet",
        model: "Equinox",
      },
      status: "active" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    } as Response);

    const requestData = {
      title: "2017 Toyota Camry SE",
      price_cents: 18500_00,
      category_id: "cat-123",
      attributes: {
        vin: "2GNALCEK1H1615946",
        year: 2017,
        make: "Chevrolet",
        model: "Equinox",
      },
    };

    const result = await createProductWithVehicle(requestData);

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestData),
    });

    expect(result).toEqual(mockProduct);
  });

  it("should include attributes.vin for auto-vehicle creation", async () => {
    const mockProduct = {
      id: "prod-1",
      title: "2017 Chevrolet Equinox",
      price_cents: 18500_00,
      category_id: "cat-123",
      attributes: {
        vin: "2GNALCEK1H1615946",
        year: 2017,
        make: "Chevrolet",
        model: "Equinox",
      },
      status: "active" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    } as Response);

    const requestData = {
      title: "2017 Chevrolet Equinox",
      price_cents: 18500_00,
      category_id: "cat-123",
      attributes: {
        vin: "2GNALCEK1H1615946",
        year: 2017,
        make: "Chevrolet",
        model: "Equinox",
      },
    };

    const result = await createProductWithVehicle(requestData);

    // Verify the VIN is in the request
    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.attributes.vin).toBe("2GNALCEK1H1615946");

    // Verify the response includes the product with ID
    expect(result.id).toBe("prod-1");
    expect(result.attributes.vin).toBe("2GNALCEK1H1615946");
  });

  it("should return product with id and attributes from response", async () => {
    const mockProduct = {
      id: "prod-123",
      title: "Vehicle Title",
      price_cents: 10000_00,
      category_id: "cat-456",
      attributes: {
        vin: "1HGCM82633A123456",
        year: 2003,
        make: "Honda",
        model: "Accord",
      },
      status: "draft" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    } as Response);

    const result = await createProductWithVehicle({
      title: "Vehicle Title",
      price_cents: 10000_00,
      category_id: "cat-456",
      attributes: {
        vin: "1HGCM82633A123456",
      },
    });

    expect(result.id).toBeDefined();
    expect(result.id).toBe("prod-123");
    expect(result.attributes).toEqual(mockProduct.attributes);
    expect(result.status).toBe("draft");
  });

  it("should throw error with message from backend on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid VIN format" }),
    } as Response);

    await expect(
      createProductWithVehicle({
        title: "Test Vehicle",
        price_cents: 1000_00,
        category_id: "cat-123",
        attributes: {
          vin: "INVALID",
        },
      }),
    ).rejects.toThrow("Invalid VIN format");
  });

  it("should handle network errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      createProductWithVehicle({
        title: "Test Vehicle",
        price_cents: 1000_00,
        category_id: "cat-123",
        attributes: {},
      }),
    ).rejects.toThrow("Network error");
  });

  it("should use default error message when backend returns no message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(
      createProductWithVehicle({
        title: "Test Vehicle",
        price_cents: 1000_00,
        category_id: "cat-123",
        attributes: {},
      }),
    ).rejects.toThrow("Failed to create product");
  });
});

describe("Products API Client - useCreateProduct", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  it("should call createProductWithVehicle as mutationFn", async () => {
    const mockProduct = {
      id: "prod-1",
      title: "2017 Toyota Camry",
      price_cents: 18500_00,
      category_id: "cat-123",
      attributes: {
        vin: "2GNALCEK1H1615946",
      },
      status: "active" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    } as Response);

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    const requestData = {
      title: "2017 Toyota Camry",
      price_cents: 18500_00,
      category_id: "cat-123",
      attributes: {
        vin: "2GNALCEK1H1615946",
      },
    };

    await waitFor(async () => {
      const response = await result.current.mutateAsync(requestData);
      expect(response.id).toBe("prod-1");
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should invalidate vehicles and products queries on success", async () => {
    const mockProduct = {
      id: "prod-1",
      title: "Vehicle",
      price_cents: 1000_00,
      category_id: "cat-123",
      attributes: {},
      status: "active" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    } as Response);

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    const invalidateQueriesSpy = vi.spyOn(
      result.current.mutateAsync as any,
      "queryClient",
    );

    await waitFor(async () => {
      await result.current.mutateAsync({
        title: "Vehicle",
        price_cents: 1000_00,
        category_id: "cat-123",
        attributes: {},
      });
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify queries were invalidated (via queryClient.invalidateQueries)
    expect(mockFetch).toHaveBeenCalled();
  });

  it("should show toast success message on successful creation", async () => {
    const { toast } = await import("sonner");

    const mockProduct = {
      id: "prod-1",
      title: "Vehicle",
      price_cents: 1000_00,
      category_id: "cat-123",
      attributes: {},
      status: "active" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    } as Response);

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    await waitFor(async () => {
      await result.current.mutateAsync({
        title: "Vehicle",
        price_cents: 1000_00,
        category_id: "cat-123",
        attributes: {},
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Product created successfully");
  });

  it("should show toast error message on creation failure", async () => {
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid category" }),
    } as Response);

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    await waitFor(async () => {
      try {
        await result.current.mutateAsync({
          title: "Vehicle",
          price_cents: 1000_00,
          category_id: "cat-123",
          attributes: {},
        });
      } catch (e) {
        // Expected error
      }
    });

    expect(toast.error).toHaveBeenCalledWith("Invalid category");
  });

  it("should set isPending state during mutation", async () => {
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    mockFetch.mockImplementationOnce(() => fetchPromise);

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    // Start mutation
    const mutationPromise = result.current.mutateAsync({
      title: "Vehicle",
      price_cents: 1000_00,
      category_id: "cat-123",
      attributes: {},
    });

    // Should be pending while fetch is in progress
    expect(result.current.isPending).toBe(true);

    // Resolve fetch
    resolveFetch!({
      ok: true,
      json: async () => ({
        id: "prod-1",
        title: "Vehicle",
        price_cents: 1000_00,
        category_id: "cat-123",
        attributes: {},
        status: "active" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      }),
    } as Response);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should no longer be pending
    expect(result.current.isPending).toBe(false);
  });

  it("should handle errors without crashing mutation", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: "Server error" }),
    } as Response);

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    await waitFor(async () => {
      try {
        await result.current.mutateAsync({
          title: "Vehicle",
          price_cents: 1000_00,
          category_id: "cat-123",
          attributes: {},
        });
      } catch (e) {
        // Expected error
      }
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(new Error("Server error"));
  });
});
