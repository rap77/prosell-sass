import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSidebar } from "@/components/filters/FilterSidebar";

// Mock Next.js router and searchParams
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("@/lib/hooks/useVehicleFilters", () => ({
  useVehicleFilters: () => ({
    filters: {
      brand: [],
      status: [],
      search: "",
      priceRange: [0, 100000],
      year: [2010, 2026],
    },
    setFilter: (key: string, value: any) => {
      // Simulate router navigation like the real hook
      if (key === "brand" && Array.isArray(value)) {
        mockPush(`/catalog?brand=${value.join(",")}`);
      } else if (key === "status" && Array.isArray(value)) {
        mockPush(`/catalog?status=${value.join(",")}`);
      } else {
        mockPush(`/catalog?${key}=${value}`);
      }
    },
    clearAllFilters: () => {
      mockPush("/catalog", { scroll: false });
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key),
    toString: () => mockSearchParams.toString(),
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("FilterSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear URLSearchParams manually
    for (const key of Array.from(mockSearchParams.keys())) {
      mockSearchParams.delete(key);
    }
  });

  it("renders faceted filters (Brand, Price, Status, Year)", () => {
    render(<FilterSidebar />);

    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.getByText("Price Range")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Year Range")).toBeInTheDocument();
  });

  it("renders all brand checkboxes", () => {
    render(<FilterSidebar />);

    const brands = [
      "Toyota",
      "Honda",
      "Ford",
      "Chevrolet",
      "Nissan",
      "BMW",
      "Mercedes",
      "Audi",
    ];

    brands.forEach((brand) => {
      expect(screen.getByLabelText(brand)).toBeInTheDocument();
    });
  });

  it("renders all status checkboxes", () => {
    render(<FilterSidebar />);

    const statuses = [
      "published",
      "pending",
      "failed",
      "draft",
      "expired",
      "online",
      "sold",
    ];

    statuses.forEach((status) => {
      expect(
        screen.getByLabelText(new RegExp(status, "i")),
      ).toBeInTheDocument();
    });
  });

  it("displays price range values", () => {
    render(<FilterSidebar />);

    // Default range is 0-100000
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$100,000")).toBeInTheDocument();
  });

  it("displays year range values", () => {
    render(<FilterSidebar />);

    // Default range is 2010-2026
    expect(screen.getByText("2010")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("toggles brand filter on checkbox click", async () => {
    const user = userEvent.setup();
    render(<FilterSidebar />);

    const toyotaCheckbox = screen.getByLabelText("Toyota");
    await user.click(toyotaCheckbox);

    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][0]).toContain("brand=Toyota");
  });

  it("toggles status filter on checkbox click", async () => {
    const user = userEvent.setup();
    render(<FilterSidebar />);

    const publishedCheckbox = screen.getByLabelText("published");
    await user.click(publishedCheckbox);

    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][0]).toContain("status=published");
  });

  it('renders "Clear All Filters" button', () => {
    render(<FilterSidebar />);

    expect(screen.getByText("Clear All Filters")).toBeInTheDocument();
  });

  it("clears all filters when button clicked", async () => {
    const user = userEvent.setup();
    render(<FilterSidebar />);

    const clearButton = screen.getByText("Clear All Filters");
    await user.click(clearButton);

    expect(mockPush).toHaveBeenCalledWith("/catalog", { scroll: false });
  });

  it("has collapse toggle button", () => {
    render(<FilterSidebar />);

    const toggleButton = screen.getByLabelText(/collapse filters/i);
    expect(toggleButton).toBeInTheDocument();
  });

  it("collapses to minimize width (w-16)", async () => {
    const user = userEvent.setup();
    const { container } = render(<FilterSidebar />);

    const toggleButton = screen.getByLabelText(/collapse filters/i);
    await user.click(toggleButton);

    const aside = container.querySelector("aside");
    expect(aside).toHaveClass("w-16");
  });

  it("expands to w-64 when not collapsed", () => {
    const { container } = render(<FilterSidebar />);

    const aside = container.querySelector("aside");
    expect(aside).toHaveClass("w-64");
  });

  it("has border-right styling", () => {
    const { container } = render(<FilterSidebar />);

    const aside = container.querySelector("aside");
    expect(aside).toHaveClass("border-r");
  });

  it("exposes the filters as a labeled complementary landmark", () => {
    render(<FilterSidebar />);

    // A11y: distinguishable accessible name so it isn't confused with the
    // main navigation sidebar when both render on the catalog page.
    expect(
      screen.getByRole("complementary", { name: /vehicle filters/i }),
    ).toBeInTheDocument();
  });

  it("hides filter content when collapsed", async () => {
    const user = userEvent.setup();
    const { container } = render(<FilterSidebar />);

    const toggleButton = screen.getByLabelText(/collapse filters/i);
    await user.click(toggleButton);

    // The inner div should have 'hidden' class when collapsed
    const innerDiv = container.querySelector(".p-4");
    expect(innerDiv).toHaveClass("hidden");
  });
});
