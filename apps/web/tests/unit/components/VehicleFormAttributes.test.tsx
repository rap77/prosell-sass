/**
 * TDD: VehicleForm Category-Specific Attribute Rendering
 * RED PHASE - Tests for dynamic attribute rendering based on category.attribute_schema
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { toast } from "sonner";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
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

describe("VehicleForm - Category-Specific Attribute Rendering", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  describe("When category has attribute_schema", () => {
    it("should only show attributes marked as true in attribute_schema", async () => {
      // Mock categories response with specific attribute_schema
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          categories: [
            {
              id: "cat-sedan",
              name: "Sedan",
              slug: "sedan",
              attribute_schema: {
                year: true,
                make: true,
                model: true,
                trim: true,
                body_type: false, // Don't show body_type
                drivetrain: true,
                transmission: true,
                fuel_type: true,
                mpg_city: false, // Don't show MPG
                mpg_highway: false,
                mpg_combined: false,
              },
              is_active: true,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          page_size: 50,
        }),
      });

      const user = userEvent.setup();
      render(
        <VehicleForm mode="create" initialData={{ category_id: "cat-sedan" }} />,
        {
          wrapper: createWrapper(),
        },
      );

      // Wait for categories to load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/v1/categories", {
          credentials: "include",
        });
      });

      // Wait for form to render with category pre-selected
      await waitFor(() => {
        // These fields SHOULD be visible (marked true in schema)
        expect(screen.getByLabelText(/Año/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Marca/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Modelo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Trim/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Tracción/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Transmisión/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Combustible/i)).toBeInTheDocument();

        // These fields should NOT be visible (marked false in schema)
        expect(screen.queryByLabelText(/Tipo de Carrocería/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/MPG Ciudad/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/MPG Carretera/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/MPG Combinado/i)).not.toBeInTheDocument();
      });
    });

    it("should show all vehicle attributes when attribute_schema is empty", async () => {
      // Mock category with empty attribute_schema (show all)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          categories: [
            {
              id: "cat-default",
              name: "Default",
              slug: "default",
              attribute_schema: {}, // Empty = show all
              is_active: true,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          page_size: 50,
        }),
      });

      render(<VehicleForm mode="create" initialData={{ category_id: "cat-default" }} />, {
        wrapper: createWrapper(),
      });

      // Wait for categories
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // All fields should be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/Año/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Marca/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Modelo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Trim/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Tipo de Carrocería/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Tracción/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Transmisión/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Combustible/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/MPG Ciudad/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/MPG Carretera/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/MPG Combinado/i)).toBeInTheDocument();
      });
    });
  });

  describe("When no category is selected", () => {
    it("should show all vehicle attributes by default", async () => {
      // Mock categories
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          categories: [],
          total: 0,
          page: 1,
          page_size: 50,
        }),
      });

      render(<VehicleForm mode="create" />, {
        wrapper: createWrapper(),
      });

      // Wait for categories
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // All fields should be visible by default
      expect(screen.getByLabelText(/Año/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Marca/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Modelo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tipo de Carrocería/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tracción/i)).toBeInTheDocument();
    });
  });

  describe("Form submission with category-specific attributes", () => {
    it("should only include attributes that are present in the form", async () => {
      mockFetch
        // Mock categories
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            categories: [
              {
                id: "cat-sedan",
                name: "Sedan",
                slug: "sedan",
                attribute_schema: {
                  year: true,
                  make: true,
                  model: true,
                  trim: false, // Don't include trim
                  body_type: false,
                  drivetrain: true,
                  transmission: true,
                  fuel_type: true,
                },
                is_active: true,
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
              },
            ],
            total: 1,
            page: 1,
            page_size: 50,
          }),
        })
        // Mock product creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "prod-1",
            title: "2017 Toyota Camry",
            price_cents: 18500_00,
            category_id: "cat-sedan",
            attributes: {},
            status: "active",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          }),
        });

      const user = userEvent.setup();
      render(<VehicleForm mode="create" initialData={{ category_id: "cat-sedan" }} />, {
        wrapper: createWrapper(),
      });

      // Wait for categories to load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Fill visible fields
      await user.type(screen.getByLabelText(/VIN/i), "1HGCM82633A123456");
      await user.type(screen.getByPlaceholderText(/18500/), "18500");

      // Submit form
      const submitButton = screen.getByRole("button", { name: /Create Vehicle/i });
      await user.click(submitButton);

      // Wait for submission
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // categories + products
      });

      // Verify the request structure
      const productRequest = mockFetch.mock.calls[1];
      const requestBody = JSON.parse(productRequest[1].body);

      // VIN should be present (user filled it)
      expect(requestBody.attributes.vin).toBe("1HGCM82633A123456");

      // Verify that price was sent
      expect(requestBody.price_cents).toBe(18500_00);

      // The key assertion: VIN is in attributes which triggers auto-vehicle creation
      expect(requestBody.attributes).toBeDefined();
    });
  });
});
