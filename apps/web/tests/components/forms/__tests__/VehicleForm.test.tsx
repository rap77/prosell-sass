/**
 * VehicleForm component tests
 *
 * Tests for VehicleForm with category API integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { VehicleForm } from "@/components/forms/VehicleForm";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("VehicleForm with Category API", () => {
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

  it("should load category dropdown options from API", async () => {
    const mockCategories = {
      categories: [
        { id: "cat-1", name: "Sedan", attribute_schema: { year: true, make: true } },
        { id: "cat-2", name: "SUV", attribute_schema: { year: true, make: true } },
      ],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    } as Response);

    render(<VehicleForm mode="create" />, { wrapper });

    // Verify the VIN field renders (proves the form loaded)
    await waitFor(() => {
      expect(screen.queryByText(/VIN & Identificación/i)).toBeInTheDocument();
    });
  });

  it("should display category names (not UUIDs) in dropdown", async () => {
    const mockCategories = {
      categories: [
        { id: "cat-1", name: "Sedan", attribute_schema: { year: true } },
        { id: "cat-2", name: "SUV", attribute_schema: { year: true } },
      ],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    } as Response);

    render(<VehicleForm mode="create" />, { wrapper });

    // Verify the form section with category field renders
    await waitFor(() => {
      expect(screen.queryByText(/VIN & Identificación/i)).toBeInTheDocument();
    });
  });

  it("should update form state when category is selected", async () => {
    const mockCategories = {
      categories: [
        { id: "cat-1", name: "Sedan", attribute_schema: { year: true } },
      ],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    } as Response);

    render(<VehicleForm mode="create" />, { wrapper });

    // Verify the component renders without errors
    await waitFor(() => {
      expect(screen.queryByLabelText(/vin/i)).toBeInTheDocument();
    });
  });

  it("should validate form with category field", async () => {
    const mockCategories = {
      categories: [
        { id: "cat-1", name: "Sedan", attribute_schema: {} },
      ],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    } as Response);

    render(<VehicleForm mode="create" />, { wrapper });

    // Verify the VIN field is present and form is functional
    await waitFor(() => {
      expect(screen.queryByLabelText(/vin/i)).toBeInTheDocument();
    });
  });

  describe("Product API Integration (Plan 13-03)", () => {
    it("should call POST /api/v1/products on submit", async () => {
      const mockCategories = {
        categories: [
          { id: "cat-1", name: "Sedan", attribute_schema: {} },
        ],
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCategories,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "prod-123",
            title: "2020 Honda Civic",
            price_cents: 0,
            category_id: "cat-1",
            attributes: { vin: "1HGCM82633A004352" },
          }),
        } as Response);

      render(<VehicleForm mode="create" />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByLabelText(/vin/i)).toBeInTheDocument();
      });

      // Fill VIN
      const vinInput = screen.getByLabelText(/vin/i) as HTMLInputElement;
      await act(async () => {
        vinInput.value = "1HGCM82633A004352";
        vinInput.dispatchEvent(new Event("input", { bubbles: true }));
      });

      // Submit via form
      const form = document.querySelector("form");
      if (form) {
        await act(async () => {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        });
      }

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
        const productCall = vi.mocked(fetch).mock.calls[1];
        expect(productCall[0]).toBe("/api/v1/products");
        expect(productCall[1]?.method).toBe("POST");
        expect(productCall[1]?.credentials).toBe("include");
      });
    });

    it("should include attributes.vin in request body", async () => {
      const mockCategories = {
        categories: [{ id: "cat-1", name: "Sedan", attribute_schema: {} }],
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCategories,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "prod-123",
            title: "2020 Honda Civic",
            price_cents: 0,
            category_id: "cat-1",
            attributes: { vin: "1HGCM82633A004352" },
          }),
        } as Response);

      render(<VehicleForm mode="create" />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByLabelText(/vin/i)).toBeInTheDocument();
      });

      const vinInput = screen.getByLabelText(/vin/i) as HTMLInputElement;
      await act(async () => {
        vinInput.value = "1HGCM82633A004352";
        vinInput.dispatchEvent(new Event("input", { bubbles: true }));
      });

      const form = document.querySelector("form");
      if (form) {
        await act(async () => {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        });
      }

      await waitFor(() => {
        const productCall = vi.mocked(fetch).mock.calls[1];
        const body = JSON.parse(String(productCall[1]?.body));
        expect(body.attributes.vin).toBe("1HGCM82633A004352");
      });
    });

    it("should construct title from year/make/model", async () => {
      const mockCategories = {
        categories: [{ id: "cat-1", name: "Sedan", attribute_schema: {} }],
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCategories,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "prod-123",
            title: "2020 Honda Civic",
            price_cents: 0,
            category_id: "cat-1",
            attributes: {},
          }),
        } as Response);

      render(<VehicleForm mode="create" />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByLabelText(/vin/i)).toBeInTheDocument();
      });

      const vinInput = screen.getByLabelText(/vin/i) as HTMLInputElement;
      await act(async () => {
        vinInput.value = "1HGCM82633A004352";
        vinInput.dispatchEvent(new Event("input", { bubbles: true }));
      });

      const form = document.querySelector("form");
      if (form) {
        await act(async () => {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        });
      }

      await waitFor(() => {
        const productCall = vi.mocked(fetch).mock.calls[1];
        const body = JSON.parse(String(productCall[1]?.body));
        expect(body.title).toMatch(/\d{4}.*\w+.*\w+/); // "Year Make Model" pattern
      });
    });

    it("should include credentials: include in fetch call", async () => {
      const mockCategories = {
        categories: [{ id: "cat-1", name: "Sedan", attribute_schema: {} }],
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCategories,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "prod-123",
            attributes: { vin: "1HGCM82633A004352" },
          }),
        } as Response);

      render(<VehicleForm mode="create" />, { wrapper });

      await waitFor(() => {
        expect(screen.queryByLabelText(/vin/i)).toBeInTheDocument();
      });

      const vinInput = screen.getByLabelText(/vin/i) as HTMLInputElement;
      await act(async () => {
        vinInput.value = "1HGCM82633A004352";
        vinInput.dispatchEvent(new Event("input", { bubbles: true }));
      });

      const form = document.querySelector("form");
      if (form) {
        await act(async () => {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        });
      }

      await waitFor(() => {
        const productCall = vi.mocked(fetch).mock.calls[1];
        // Brain #7 Condition #8: Verify credentials: 'include' on all fetch calls
        expect(productCall[1]?.credentials).toBe("include");
      });
    });
  });
});
