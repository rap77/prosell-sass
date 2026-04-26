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
