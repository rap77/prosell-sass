import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ProductsPage from "./page";

// Mock dependencies
vi.mock("@/lib/api/products", () => ({
  useProducts: vi.fn(() => ({
    data: {
      products: [],
      total: 0,
      page: 1,
      page_size: 10,
      total_pages: 1,
    },
    isLoading: false,
  })),
  useCreateProduct: vi.fn(() => ({
    mutate: vi.fn(),
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

    const header = container.querySelector(
      ".flex.items-center.justify-between.mb-6",
    );
    expect(header).toBeTruthy();
    expect(
      header?.className.includes("flex-col") &&
        header?.className.includes("md:flex-row"),
    ).toBe(true);
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

  it("form action buttons should stack on mobile", () => {
    const { getByText, container } = render(<ProductsPage />);

    // Open form
    const newButton = getByText("New Product");
    newButton.click();

    // Action buttons container
    const actionButtons = container.querySelector(".flex.gap-2");
    expect(actionButtons).toBeTruthy();
    expect(
      actionButtons?.className.includes("flex-col") ||
        actionButtons?.className.includes("flex-wrap"),
    ).toBe(true);
  });
});
