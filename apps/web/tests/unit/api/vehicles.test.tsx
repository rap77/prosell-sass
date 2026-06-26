/**
 * Vehicles API tests
 *
 * Tests for the production hooks in `lib/api/vehicles.ts`:
 *   - `useDecodeVin` (POST /api/v1/vehicles/decode-vin)
 *
 * `useBulkUploadProducts` was removed from this file in PR2 (moved to
 * `lib/api/products.ts` and rewritten as a schema-aware FormData upload).
 * Its tests now live in `tests/unit/api/bulkUpload.test.tsx`.
 *
 * The list/get/create/update/delete hooks used to live in this file
 * (`useVehicles`, `useInfiniteVehicles`, `useVehicle`,
 * `useFeaturedVehicles`, `useUpdateVehicle`, `useDeleteVehicle`,
 * `useCreateVehicle`, `useBulkUploadVehicles`) but have been removed
 * — the production app uses the equivalents in `lib/api/products.ts`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { useDecodeVin } from "@/lib/api/vehicles";

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
      "/api/v1/vehicles/decode-vin",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ vin: "1HGCM82633A123456" }),
      }),
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
      }),
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
