import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ProductsPage from "./page";

// Mock dependencies
vi.mock("@/lib/api/products", () => ({
  useProducts: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useCreateProduct: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  useUpdateProductStatus: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("@/lib/api/categories", () => ({
  useCategoryOptions: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("ProductsPage - Mobile-First", () => {
  it("header should be responsive: flex-col md:flex-row", () => {
    const { container } = render(<ProductsPage />);

    const header = container.querySelector(".flex.justify-between.mb-6");
    expect(header).toBeTruthy();
    expect(header?.className).toContain("flex-col");
    expect(header?.className).toContain("md:flex-row");
    expect(header?.className).toContain("md:items-center");
    expect(header?.className).toContain("gap-4");
  });

  it("new product button should stack on mobile: w-full md:w-auto", () => {
    const { getByText } = render(<ProductsPage />);

    const newButton = getByText("New Product").closest("button");
    expect(newButton).toBeTruthy();
    expect(newButton?.className).toContain("w-full");
    expect(newButton?.className).toContain("md:w-auto");
  });

  it("status filter should wrap on small screens: flex-wrap", () => {
    const { container } = render(<ProductsPage />);

    const filterNav = container.querySelector(
      "nav[aria-label='Product status filter']",
    );
    expect(filterNav).toBeTruthy();
    expect(filterNav?.className).toContain("flex-wrap");
  });

  it("form action buttons should stack on mobile", async () => {
    const { getByText, container } = render(<ProductsPage />);

    // Open form
    const newButton = getByText("New Product");
    await vi.waitFor(() => newButton.click());

    // Action buttons container (last .flex.gap-2 is the form buttons)
    const allFlexGap = container.querySelectorAll(".flex.gap-2");
    const actionButtons = allFlexGap[allFlexGap.length - 1]; // Last one is form buttons
    expect(actionButtons).toBeTruthy();
    expect(
      actionButtons?.className.includes("flex-col") ||
        actionButtons?.className.includes("md:flex-row"),
    ).toBe(true);
  });
});
