import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CategoryAdminClient } from "./category-admin-client";
import * as categoriesApi from "@/lib/api/categories";
import * as authHooks from "@/hooks/useAuth";
import type { Category } from "@/types/category";

// Mock hooks
vi.mock("@/lib/api/categories", () => ({
  useCategories: vi.fn(),
  useReorderCategories: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useDeleteCategory: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockCategories: Category[] = [
  {
    id: "cat-1",
    name: "Vehículos",
    slug: "vehiculos",
    is_active: true,
    attribute_schema: {},
    parent_id: null,
    order_index: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

describe("CategoryAdminClient Mobile-First", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Header Responsive", () => {
    it("should have responsive header (flex-col on mobile)", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        isError: false,
      } as any);
      vi.mocked(authHooks.useAuth).mockReturnValue({
        isSuperAdmin: true,
      } as any);

      const { container } = render(<CategoryAdminClient />);

      // Header should have flex-col md:flex-row
      const header = container.querySelector(
        'div[class*="flex-col"][class*="md:flex-row"]',
      );
      expect(header).toBeInTheDocument();
    });

    it("should have full-width button on mobile", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        isError: false,
      } as any);
      vi.mocked(authHooks.useAuth).mockReturnValue({
        isSuperAdmin: true,
      } as any);

      render(<CategoryAdminClient />);

      const button = screen.getByText(/Nueva categoría/i);

      // Should have w-full md:w-auto
      expect(button.className).toMatch(/w-full/);
      expect(button.className).toMatch(/md:w-auto/);
    });
  });

  describe("Loading & Error States", () => {
    it("should show loading state", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as any);
      vi.mocked(authHooks.useAuth).mockReturnValue({
        isSuperAdmin: true,
      } as any);

      render(<CategoryAdminClient />);

      expect(screen.getByText(/Cargando categorías/i)).toBeInTheDocument();
    });

    it("should show error state", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as any);
      vi.mocked(authHooks.useAuth).mockReturnValue({
        isSuperAdmin: true,
      } as any);

      render(<CategoryAdminClient />);

      expect(
        screen.getByText(/Error al cargar categorías/i),
      ).toBeInTheDocument();
    });
  });
});
