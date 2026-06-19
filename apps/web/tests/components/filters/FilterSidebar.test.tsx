/**
 * FilterSidebar — Subsystem B (Task 9: generic FilterSidebar).
 *
 * Drives the catalog filter UI from a category's `filter_fields`
 * contract. Renders one control per field based on `filter_type`,
 * using `useCatalogFilters` (T7) for URL state and `fetchFilterValues`
 * (T8) for facet data on `select` fields without static options.
 *
 * Spec: docs/superpowers/specs/2026-06-06-subsystem-b-dynamic-filters-design.md
 */

import { render, screen } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import { FilterSidebar } from "@/components/filters/FilterSidebar";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

describe("FilterSidebar", () => {
  it("renders a slider for range and checkboxes for select", () => {
    render(
      <FilterSidebar
        fields={[
          { key: "year", filter_type: "range" },
          { key: "make", filter_type: "select" },
        ]}
        schema={{
          year: { type: "number", filter_type: "range" },
          make: { type: "string", filter_type: "select" },
        }}
        facetValues={{ make: ["Toyota", "Honda"] }}
      />,
    );
    expect(
      screen.getByRole("complementary", { name: "Catalog filters" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Toyota")).toBeInTheDocument();
    expect(screen.queryByText("Vehicle filters")).not.toBeInTheDocument();
  });

  it("anchors the collapse button inside the aside (parent is `relative`)", () => {
    // The collapse button uses `className="absolute -right-3 top-6 z-10 ..."`.
    // Without `position: relative` on the parent <aside>, the button
    // positions against an unrelated ancestor — visually broken.
    render(
      <FilterSidebar
        fields={[{ key: "make", filter_type: "select" }]}
        schema={{
          make: { type: "string", filter_type: "select" },
        }}
        facetValues={{ make: ["Toyota"] }}
      />,
    );
    const aside = screen.getByRole("complementary", {
      name: "Catalog filters",
    });
    expect(aside.className).toContain("relative");
  });

  it("uses schema.validation_rules as Slider bounds (not hardcoded 0-100)", () => {
    // Spec §Frontend line 132: Slider bounds from validation_rules.
    // Previously hardcoded `min={0} max={100}` made the year Slider
    // (range 1980-2026) practically useless.
    render(
      <FilterSidebar
        fields={[{ key: "year", filter_type: "range" }]}
        schema={{
          year: {
            type: "number",
            filter_type: "range",
            validation_rules: { min: 1980, max: 2026 },
          },
        }}
      />,
    );
    // Radix Slider exposes min/max as ARIA values on each thumb.
    const thumbs = screen.getAllByRole("slider");
    for (const thumb of thumbs) {
      expect(thumb.getAttribute("aria-valuemin")).toBe("1980");
      expect(thumb.getAttribute("aria-valuemax")).toBe("2026");
    }
  });
});
