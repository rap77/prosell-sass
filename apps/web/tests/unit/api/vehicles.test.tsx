/**
 * Vehicles API tests
 *
 * Tests for vehicle API client hooks including useDecodeVin
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { useDecodeVin, useInfiniteVehicles, transformVehicleWithProduct } from "@/lib/api/vehicles";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("useDecodeVin", () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  it("should send POST to /api/v1/vehicles/decode-vin", async () => {
    const mockResponse = {
      vehicle: {
        vin: "1HGCM82633A123456",
        year: 2003,
        make: "Honda",
        model: "Civic",
        trim: "LX",
        body_type: "Sedan",
        drivetrain: "FWD",
        transmission: "Automatic",
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useDecodeVin(), { wrapper });

    result.current.mutate("1HGCM82633A123456");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/vehicles/decode-vin?vin=1HGCM82633A123456",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
  });

  it("should pass VIN as query parameter", async () => {
    const mockResponse = {
      vehicle: {
        vin: "1HGCM82633A123456",
        year: 2003,
        make: "Honda",
        model: "Civic",
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useDecodeVin(), { wrapper });

    result.current.mutate("1HGCM82633A123456");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("vin=1HGCM82633A123456"),
      expect.any(Object)
    );
  });

  it("should return decoded vehicle data", async () => {
    const mockResponse = {
      vehicle: {
        vin: "1HGCM82633A123456",
        year: 2003,
        make: "Honda",
        model: "Civic",
        trim: "LX",
        body_type: "Sedan",
        drivetrain: "FWD",
        transmission: "Automatic",
        fuel_type: "Gasoline",
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useDecodeVin(), { wrapper });

    result.current.mutate("1HGCM82633A123456");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse.vehicle);
  });

  it("should show toast error on failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid VIN" }),
    } as Response);

    const { result } = renderHook(() => useDecodeVin(), { wrapper });

    result.current.mutate("INVALID_VIN");

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith("Invalid VIN");
  });
});

describe("transformVehicleWithProduct", () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  it("should extract title from product.title", async () => {
    
    const backendItem = {
      id: "vehicle-uuid",
      product_id: "product-uuid",
      vin: "1HGCM82633A123456",
      year: 2020,
      make: "Honda",
      model: "Civic",
      trim: "LX",
      created_at: "2024-01-01T00:00:00Z",
      product: {
        id: "product-uuid",
        title: "2020 Honda Civic LX",
        price_cents: 2500000,
        status: "active",
        category_id: "category-uuid",
        created_at: "2024-01-01T00:00:00Z",
      },
    };

    const result = transformVehicleWithProduct(backendItem);

    expect(result.title).toBe("2020 Honda Civic LX");
  });

  it("should extract price from product.price_cents", async () => {
    
    const backendItem = {
      id: "vehicle-uuid",
      product_id: "product-uuid",
      vin: "1HGCM82633A123456",
      year: 2020,
      make: "Honda",
      model: "Civic",
      created_at: "2024-01-01T00:00:00Z",
      product: {
        id: "product-uuid",
        title: "2020 Honda Civic",
        price_cents: 1850000,
        status: "active",
        category_id: "category-uuid",
        created_at: "2024-01-01T00:00:00Z",
      },
    };

    const result = transformVehicleWithProduct(backendItem);

    expect(result.price).toBe(18500);
  });

  it("should extract status from product.status", async () => {
    
    const backendItem = {
      id: "vehicle-uuid",
      product_id: "product-uuid",
      vin: "1HGCM82633A123456",
      year: 2020,
      make: "Honda",
      model: "Civic",
      created_at: "2024-01-01T00:00:00Z",
      product: {
        id: "product-uuid",
        title: "2020 Honda Civic",
        price_cents: 1850000,
        status: "draft",
        category_id: "category-uuid",
        created_at: "2024-01-01T00:00:00Z",
      },
    };

    const result = transformVehicleWithProduct(backendItem);

    expect(result.status).toBe("draft");
  });

  it("should preserve vehicle fields", async () => {
    
    const backendItem = {
      id: "vehicle-uuid",
      product_id: "product-uuid",
      vin: "1HGCM82633A123456",
      year: 2020,
      make: "Honda",
      model: "Civic",
      trim: "LX",
      mileage: 50000,
      exterior_color: "Blue",
      interior_color: "Black",
      dealer_id: "dealer-uuid",
      dealer_name: "Test Dealer",
      created_at: "2024-01-01T00:00:00Z",
      product: {
        id: "product-uuid",
        title: "2020 Honda Civic LX",
        price_cents: 1850000,
        status: "active",
        category_id: "category-uuid",
        created_at: "2024-01-01T00:00:00Z",
      },
    };

    const result = transformVehicleWithProduct(backendItem);

    expect(result.year).toBe(2020);
    expect(result.make).toBe("Honda");
    expect(result.model).toBe("Civic");
    expect(result.dealer_id).toBe("dealer-uuid");
    expect(result.dealer_name).toBe("Test Dealer");
  });

  it("should useInfiniteVehicles use new transform function", async () => {
    const mockResponse: any = {
      items: [
        {
          id: "vehicle-uuid",
          product_id: "product-uuid",
          vin: "1HGCM82633A123456",
          year: 2020,
          make: "Honda",
          model: "Civic",
          created_at: "2024-01-01T00:00:00Z",
          product: {
            id: "product-uuid",
            title: "2020 Honda Civic",
            price_cents: 1850000,
            status: "active",
            category_id: "category-uuid",
            created_at: "2024-01-01T00:00:00Z",
          },
        },
      ],
      next_cursor: "next-cursor",
      has_more: true,
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useInfiniteVehicles(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const vehicles = result.current.data?.pages[0]?.items;
    expect(vehicles?.[0].title).toBe("2020 Honda Civic");
    expect(vehicles?.[0].price).toBe(18500);
    expect(vehicles?.[0].status).toBe("active");
  });
});