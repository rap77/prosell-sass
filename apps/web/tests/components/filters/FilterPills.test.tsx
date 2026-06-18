/**
 * FilterPills — Subsystem B (Task 10: generic FilterPills).
 *
 * Renders one removable pill per active value, derived from
 * `useCatalogFilters` (T7), driven by a category's `filter_fields`.
 *
 * Spec: docs/superpowers/specs/2026-06-17-subsystem-b-dynamic-filters-design.md
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FilterPills } from "@/components/filters/FilterPills";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

describe("FilterPills", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockClear();
  });

  it("renders nothing when no filter is active", () => {
    mockSearchParams = new URLSearchParams();
    const { container } = render(
      <FilterPills fields={[{ key: "make", filter_type: "select" }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a pill for each active select value", () => {
    mockSearchParams = new URLSearchParams("make=Toyota,Honda");
    render(<FilterPills fields={[{ key: "make", filter_type: "select" }]} />);
    expect(screen.getByText(/Toyota/)).toBeInTheDocument();
    expect(screen.getByText(/Honda/)).toBeInTheDocument();
  });

  it("shows one combined pill for an active range", () => {
    mockSearchParams = new URLSearchParams("year_min=2015&year_max=2020");
    render(<FilterPills fields={[{ key: "year", filter_type: "range" }]} />);
    expect(screen.getByText(/2015/)).toBeInTheDocument();
    expect(screen.getByText(/2020/)).toBeInTheDocument();
  });

  it("removes a single select value and keeps the others on pill click", async () => {
    mockSearchParams = new URLSearchParams("make=Toyota,Honda");
    const user = userEvent.setup();
    render(<FilterPills fields={[{ key: "make", filter_type: "select" }]} />);

    await user.click(screen.getByText(/Toyota/));

    expect(mockPush).toHaveBeenCalledWith("?make=Honda", { scroll: false });
  });

  it("clears both bounds of a range in a single push on pill click", async () => {
    mockSearchParams = new URLSearchParams("year_min=2015&year_max=2020");
    const user = userEvent.setup();
    render(<FilterPills fields={[{ key: "year", filter_type: "range" }]} />);

    await user.click(screen.getByText(/2015/));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("?", { scroll: false });
  });

  it("clears all active filters via the Clear all button", async () => {
    mockSearchParams = new URLSearchParams("make=Toyota");
    const user = userEvent.setup();
    render(<FilterPills fields={[{ key: "make", filter_type: "select" }]} />);

    await user.click(screen.getByText("Clear all"));

    expect(mockPush).toHaveBeenCalledWith("?", { scroll: false });
  });
});
