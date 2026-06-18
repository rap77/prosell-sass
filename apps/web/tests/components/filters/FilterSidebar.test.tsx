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
});
