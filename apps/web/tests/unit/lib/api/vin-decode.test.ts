/**
 * Unit tests for VIN Decode integration
 *
 * Tests cover:
 * - VIN decode mutation hook
 * - NHTSA API integration via backend proxy
 * - Decoded vehicle data structure
 * - Error handling for invalid VINs
 * - Integration with VehicleForm
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDecodeVin } from "@/lib/api/vehicles";
import type { DecodedVehicle } from "@/lib/api/vehicles";

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

// Helper to create wrapper with QueryClient
import { createElement } from "react";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
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

describe("useDecodeVin", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  it("should send POST request to /api/v1/vehicles/decode-vin with VIN in body", async () => {
    const mockDecodedVehicle: DecodedVehicle = {
      vin: "2GNALCEK1H1615946",
      year: 2017,
      make: "Chevrolet",
      model: "Equinox",
      trim: "LT",
      body_type: "SUV",
      drivetrain: "FWD",
      transmission: "Automatic",
      fuel_type: "Gasoline",
      engine: "2.4L I4",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vehicle: mockDecodedVehicle }),
    });

    const { result } = renderHook(() => useDecodeVin(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("2GNALCEK1H1615946");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/vehicles/decode-vin",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ vin: "2GNALCEK1H1615946" }),
      })
    );
  });

  it("should return decoded vehicle data with all expected fields", async () => {
    const mockDecodedVehicle: DecodedVehicle = {
      vin: "2GNALCEK1H1615946",
      year: 2017,
      make: "Chevrolet",
      model: "Equinox",
      trim: "LT",
      body_type: "SUV",
      drivetrain: "FWD",
      transmission: "Automatic",
      fuel_type: "Gasoline",
      engine: "2.4L I4",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vehicle: mockDecodedVehicle }),
    });

    const { result } = renderHook(() => useDecodeVin(), {
      wrapper: createWrapper(),
    });

    const decodedVehicle = await result.current.mutateAsync("2GNALCEK1H1615946");

    expect(decodedVehicle).toEqual(mockDecodedVehicle);
    expect(decodedVehicle.vin).toBe("2GNALCEK1H1615946");
    expect(decodedVehicle.year).toBe(2017);
    expect(decodedVehicle.make).toBe("Chevrolet");
    expect(decodedVehicle.model).toBe("Equinox");
  });

  it("should handle partial data (missing optional fields)", async () => {
    const partialDecodedVehicle: DecodedVehicle = {
      vin: "1HGCM82633A123456",
      year: 2003,
      make: "Honda",
      model: "Accord",
      // trim, body_type, drivetrain, transmission, fuel_type, engine are optional
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vehicle: partialDecodedVehicle }),
    });

    const { result } = renderHook(() => useDecodeVin(), {
      wrapper: createWrapper(),
    });

    const decodedVehicle = await result.current.mutateAsync("1HGCM82633A123456");

    expect(decodedVehicle.vin).toBe("1HGCM82633A123456");
    expect(decodedVehicle.year).toBe(2003);
    expect(decodedVehicle.make).toBe("Honda");
    expect(decodedVehicle.model).toBe("Accord");
    expect(decodedVehicle.trim).toBeUndefined();
    expect(decodedVehicle.body_type).toBeUndefined();
  });

  it("should show success toast on successful decode", async () => {
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vehicle: {
          vin: "2GNALCEK1H1615946",
          year: 2017,
          make: "Chevrolet",
          model: "Equinox",
        },
      }),
    });

    const { result } = renderHook(() => useDecodeVin(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("2GNALCEK1H1615946");

    expect(toast.success).toHaveBeenCalledWith("VIN decoded successfully");
  });

  it("should throw error with backend message for invalid VIN", async () => {
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid VIN format" }),
    });

    const { result } = renderHook(() => useDecodeVin(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync("INVALID_VIN")
    ).rejects.toThrow("Invalid VIN format");

    expect(toast.error).toHaveBeenCalledWith("Invalid VIN format");
  });

  it("should throw generic error when backend returns no message", async () => {
    const { toast } = await import("sonner");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), // No message field
    });

    const { result } = renderHook(() => useDecodeVin(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync("2GNALCEK1H1615946")
    ).rejects.toThrow("Failed to decode VIN");

    expect(toast.error).toHaveBeenCalledWith("Failed to decode VIN");
  });

  it("should handle network errors gracefully", async () => {
    const { toast } = await import("sonner");

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useDecodeVin(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync("2GNALCEK1H1615946")
    ).rejects.toThrow("Network error");

    // onError is called with the error, but message is "Network error", not "Failed to decode VIN"
    expect(toast.error).toHaveBeenCalledWith("Network error");
  });

  it("should expose loading state during decode", async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  vehicle: { vin: "2GNALCEK1H1615946", year: 2017 },
                }),
              }),
            100
          )
        )
    );

    const { result } = renderHook(() => useDecodeVin(), {
      wrapper: createWrapper(),
    });

    // Start mutation
    const promise = result.current.mutateAsync("2GNALCEK1H1615946");

    // Wait for next tick to check pending state
    await waitFor(
      () => {
        expect(result.current.isPending).toBe(true);
      },
      { timeout: 3000 }
    );

    await promise;

    // After completion, should not be pending
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });
});
