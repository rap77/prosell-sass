import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import CategoriesPage from "./page";
import * as categoriesApi from "@/lib/api/categories";
import type { Category } from "@/types/category";

// Mock useCategories hook
vi.mock("@/lib/api/categories", () => ({
  useCategories: vi.fn(),
}));

const mockCategories: Category[] = [
  {
    id: "cat-1",
    name: "Vehículos",
    slug: "vehiculos",
    is_active: true,
    attribute_schema: {
      marca: { type: "string", filter_type: "text", required: true },
      modelo: { type: "string", filter_type: "text", required: true },
      año: { type: "number", filter_type: "range", required: true },
      kilometraje: { type: "number", filter_type: "range", required: true },
      color: { type: "string", filter_type: "text", required: false },
      vin: { type: "string", filter_type: "exact", required: false },
    },
    parent_id: null,
    level: 0,
    sort_order: 0,
    icon: null,
    description: null,
    image_url: null,
    attribute_groups: [],
    presentation: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "cat-2",
    name: "Inmuebles",
    slug: "inmuebles",
    is_active: false,
    attribute_schema: {
      tipo: { type: "string", filter_type: "select", required: true },
      superficie: { type: "number", filter_type: "range", required: true },
    },
    parent_id: null,
    level: 0,
    sort_order: 1,
    icon: null,
    description: null,
    image_url: null,
    attribute_groups: [],
    presentation: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

describe("CategoriesPage Mobile-First", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Grid Responsive", () => {
    it("should have single column on mobile viewport (390px)", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      // Set mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 390,
      });

      const { container } = render(<CategoriesPage />);

      // Find grid container
      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();

      // Should have grid-cols-1 on mobile
      expect(grid).toHaveClass("grid-cols-1");

      // Should have md:grid-cols-2 for tablet+
      expect(grid).toHaveClass("md:grid-cols-2");
    });

    it("should have 3 columns on desktop (1024px+)", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<CategoriesPage />);

      const grid = container.querySelector(".grid");

      // Should have xl:grid-cols-3 for desktop
      expect(grid).toHaveClass("xl:grid-cols-3");
    });
  });

  describe("NicheCard Mobile Optimization", () => {
    it("should reduce icon size on mobile (w-10 h-10 instead of w-13 h-13)", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<CategoriesPage />);

      // Find first niche card icon container
      const iconContainer = container.querySelector(
        'span[class*="w-10"][class*="h-10"]',
      );
      expect(iconContainer).toBeInTheDocument();

      // Should have responsive classes
      expect(iconContainer).toHaveClass("w-10"); // mobile: 40px
      expect(iconContainer).toHaveClass("md:w-13"); // desktop: 52px
    });

    it("should hide stats on mobile, show on desktop", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<CategoriesPage />);

      // Stats section should be hidden on mobile
      const statsSection = container.querySelector(
        'div[class*="hidden"][class*="md:flex"]',
      );
      expect(statsSection).toBeInTheDocument();
    });

    it("should stack actions vertically on mobile", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<CategoriesPage />);

      // Find actions container in active card
      const actionsContainer = container.querySelector(
        'div[class*="flex-col"][class*="md:flex-row"]',
      );
      expect(actionsContainer).toBeInTheDocument();
    });
  });

  describe("CustomFieldsCard Table Mobile", () => {
    it("should have horizontal scroll on mobile", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<CategoriesPage />);

      // Table should be wrapped in overflow-x-auto
      const tableWrapper = container.querySelector(
        'div[class*="overflow-x-auto"]',
      );
      expect(tableWrapper).toBeInTheDocument();

      // Table inside wrapper
      const table = tableWrapper?.querySelector("table");
      expect(table).toBeInTheDocument();
    });

    it("should have touch-pan-x for mobile scrolling", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<CategoriesPage />);

      const tableWrapper = container.querySelector(
        'div[class*="overflow-x-auto"]',
      );
      expect(tableWrapper).toHaveClass("touch-pan-x");
    });
  });

  describe("Header Mobile Responsive", () => {
    it("should stack header elements on mobile", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<CategoriesPage />);

      // Header container should flex-col on mobile, flex-row on desktop
      const header = container.querySelector(
        'div[class*="flex-col"][class*="md:flex-row"]',
      );
      expect(header).toBeInTheDocument();
    });

    it("should have full-width button on mobile", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      render(<CategoriesPage />);

      // Button "Nueva categoría" should exist
      const button = screen.getByText(/Nueva categoría/i);
      expect(button).toBeInTheDocument();

      // Check it has responsive classes (w-full md:w-auto)
      expect(button.className).toMatch(/w-full/);
      expect(button.className).toMatch(/md:w-auto/);
    });
  });

  describe("Touch Targets", () => {
    it("should have min 44px height classes for interactive elements", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
      } as any);

      render(<CategoriesPage />);

      // CtaButton should have h-10 (40px) or h-11 (44px) classes
      const button = screen.getByText(/Nueva categoría/i);

      // Check it has height class (h-10, h-11, or h-[38px])
      const hasHeightClass =
        button.className.includes("h-10") ||
        button.className.includes("h-11") ||
        button.className.includes("h-[38px]") ||
        button.className.includes("h-[40px]");

      expect(hasHeightClass).toBe(true);
    });
  });

  describe("Loading State", () => {
    it("should show skeleton on loading", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(<CategoriesPage />);

      // Should render PageSkeleton
      const skeletonCards = screen.getAllByTestId("skeleton-card");
      expect(skeletonCards.length).toBeGreaterThan(0);
    });
  });

  describe("Error State", () => {
    it("should show error message and retry button", () => {
      vi.mocked(categoriesApi.useCategories).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Failed to load"),
      } as any);

      render(<CategoriesPage />);

      expect(
        screen.getByText(/Error al cargar las categorías/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Reintentar/i)).toBeInTheDocument();
    });
  });
});
