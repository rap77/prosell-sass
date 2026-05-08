/**
 * Vehicles API tests
 *
 * Tests for vehicle API client hooks including useDecodeVin
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { useDecodeVin, useInfiniteVehicles, transformVehicleWithProduct, useBulkUploadProducts } from "@/lib/api/vehicles";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock File.text() method for jsdom environment
Object.defineProperty(File.prototype, 'text', {
  writable: true,
  value: function(this: File) {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(this);
    });
  },
});

// Mock csv-parse/sync
vi.mock("csv-parse/sync", () => ({
  parse: vi.fn((text: string, options: any) => {
    // Simple CSV parser for testing
    const lines = text.split("\n").filter((line: string) => line.trim());
    const headers = lines[0].split(",");
    return lines.slice(1).map((line: string) => {
      const values = line.split(",");
      const obj: Record<string, string> = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = values[index];
      });
      return obj;
    });
  }),
}));

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
      "/api/v1/vehicles/decode-vin",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ vin: "1HGCM82633A123456" }),
      })
    );
  });

  it("should send VIN in POST request body", async () => {
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
      "/api/v1/vehicles/decode-vin",
      expect.objectContaining({
        body: expect.stringContaining("1HGCM82633A123456"),
      })
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
      id: "product-uuid",
      tenant_id: "tenant-uuid",
      organization_id: "org-uuid",
      category_id: "category-uuid",
      title: "2020 Honda Civic LX",
      price_cents: 2500000,
      currency: "USD",
      condition: "used" as const,
      status: "active" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      attributes: { category: "vehicle", year: 2020, make: "Honda", model: "Civic", trim: "LX" },
    };

    const result = transformVehicleWithProduct(backendItem as any);

    expect(result.title).toBe("2020 Honda Civic LX");
  });

  it("should extract price from product.price_cents", async () => {
    const backendItem = {
      id: "product-uuid",
      tenant_id: "tenant-uuid",
      organization_id: "org-uuid",
      category_id: "category-uuid",
      title: "2020 Honda Civic",
      price_cents: 1850000,
      currency: "USD",
      condition: "used" as const,
      status: "active" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      attributes: { category: "vehicle", year: 2020, make: "Honda", model: "Civic" },
    };

    const result = transformVehicleWithProduct(backendItem as any);

    expect(result.price).toBe(18500);
  });

  it("should extract status from product.status", async () => {
    const backendItem = {
      id: "product-uuid",
      tenant_id: "tenant-uuid",
      organization_id: "org-uuid",
      category_id: "category-uuid",
      title: "2020 Honda Civic",
      price_cents: 1850000,
      currency: "USD",
      condition: "used" as const,
      status: "draft" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      attributes: { category: "vehicle", year: 2020, make: "Honda", model: "Civic" },
    };

    const result = transformVehicleWithProduct(backendItem as any);

    expect(result.status).toBe("draft");
  });

  it("should preserve vehicle attribute fields", async () => {
    const backendItem = {
      id: "product-uuid",
      tenant_id: "tenant-uuid",
      organization_id: "org-uuid",
      category_id: "category-uuid",
      title: "2020 Honda Civic LX",
      price_cents: 1850000,
      currency: "USD",
      condition: "used" as const,
      status: "active" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      attributes: {
        category: "vehicle",
        year: 2020,
        make: "Honda",
        model: "Civic",
        trim: "LX",
        mileage: 50000,
      },
    };

    const result = transformVehicleWithProduct(backendItem as any);

    expect(result.year).toBe(2020);
    expect(result.make).toBe("Honda");
    expect(result.model).toBe("Civic");
  });

  it("should useInfiniteVehicles use new transform function", async () => {
    const mockResponse: any = {
      products: [
        {
          id: "product-uuid",
          tenant_id: "tenant-uuid",
          organization_id: "org-uuid",
          category_id: "category-uuid",
          title: "2020 Honda Civic",
          price_cents: 1850000,
          currency: "USD",
          condition: "used",
          status: "active",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          attributes: { category: "vehicle", year: 2020, make: "Honda", model: "Civic" },
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

describe("useBulkUploadProducts", () => {
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

  it("should parse CSV correctly", async () => {
    const mockResponse = {
      total_rows: 2,
      created_count: 2,
      failed_count: 0,
      errors: [],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useBulkUploadProducts(), { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500
2T1BURHE0FC123456,2015,Toyota,Camry,12000`;
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    result.current.mutate(file);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/products/bulk",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
  });

  it("should map CSV columns to attributes", async () => {
    const mockResponse = {
      total_rows: 1,
      created_count: 1,
      failed_count: 0,
      errors: [],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useBulkUploadProducts(), { wrapper });

    const csvContent = `vin,year,make,model,trim,mileage,exterior_color,interior_color
1HGCM82633A123456,2020,Honda,Civic,LX,50000,Black,Black`;
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    result.current.mutate(file);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1]?.body as string);

    expect(requestBody.products[0].attributes).toMatchObject({
      vin: "1HGCM82633A123456",
      year: 2020,
      make: "Honda",
      model: "Civic",
      trim: "LX",
      mileage: 50000,
      exterior_color: "Black",
      interior_color: "Black",
    });
  });

  it("should include vin in attributes", async () => {
    const mockResponse = {
      total_rows: 1,
      created_count: 1,
      failed_count: 0,
      errors: [],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useBulkUploadProducts(), { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500`;
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    result.current.mutate(file);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1]?.body as string);

    expect(requestBody.products[0].attributes.vin).toBe("1HGCM82633A123456");
  });

  it("should convert price to cents", async () => {
    const mockResponse = {
      total_rows: 1,
      created_count: 1,
      failed_count: 0,
      errors: [],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useBulkUploadProducts(), { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500`;
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    result.current.mutate(file);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1]?.body as string);

    expect(requestBody.products[0].price_cents).toBe(1850000); // 18500 * 100
  });

  it("should send POST to /api/v1/products/bulk", async () => {
    const mockResponse = {
      total_rows: 1,
      created_count: 1,
      failed_count: 0,
      errors: [],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useBulkUploadProducts(), { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500`;
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    result.current.mutate(file);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/products/bulk",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("should show success toast when all uploads succeed", async () => {
    const mockResponse = {
      total_rows: 2,
      created_count: 2,
      failed_count: 0,
      errors: [],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useBulkUploadProducts(), { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500
2T1BURHE0FC123456,2015,Toyota,Camry,12000`;
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    await act(async () => {
      result.current.mutate(file);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith("Successfully uploaded 2 vehicles");
  });

  it("should show error toast when some uploads fail", async () => {
    const mockResponse = {
      total_rows: 2,
      created_count: 1,
      failed_count: 1,
      errors: [
        {
          row_number: 2,
          vin: "INVALID_VIN",
          error: "Invalid VIN checksum",
        },
      ],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useBulkUploadProducts(), { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500
INVALID_VIN,2015,Toyota,Camry,12000`;
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    await act(async () => {
      result.current.mutate(file);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Uploaded 1 vehicles, 1 failed. Check errors below."
    );
  });
});