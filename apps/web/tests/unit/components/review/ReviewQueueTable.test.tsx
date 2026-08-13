import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewQueueTable } from "@/components/review/ReviewQueueTable";
import type { Product } from "@/types/product";

describe("ReviewQueueTable", () => {
  const mockProducts: Product[] = [
    {
      id: "product-1",
      title: "2020 Toyota Camry",
      price_cents: 2500000, // $25,000
      image_urls: ["https://example.com/image1.jpg"],
      submitted_for_approval_at: "2024-01-15T10:00:00Z",
      status: "pending",
      organization_id: "org-1",
      created_at: "2024-01-10T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
    },
    {
      id: "product-2",
      title: "2019 Honda Accord",
      price_cents: 2200000, // $22,000
      image_urls: ["https://example.com/image2.jpg"],
      submitted_for_approval_at: "2024-01-16T10:00:00Z",
      status: "pending",
      organization_id: "org-1",
      created_at: "2024-01-11T10:00:00Z",
      updated_at: "2024-01-16T10:00:00Z",
    },
    {
      id: "product-3",
      title: "2021 Ford F-150",
      price_cents: 3500000, // $35,000
      image_urls: [],
      submitted_for_approval_at: "2024-01-17T10:00:00Z",
      status: "pending",
      organization_id: "org-1",
      created_at: "2024-01-12T10:00:00Z",
      updated_at: "2024-01-17T10:00:00Z",
    },
  ];

  let mockOnSelectionChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSelectionChange = vi.fn();
  });

  it("renders table with products", () => {
    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    expect(screen.getByText("2020 Toyota Camry")).toBeInTheDocument();
    expect(screen.getByText("2019 Honda Accord")).toBeInTheDocument();
    expect(screen.getByText("2021 Ford F-150")).toBeInTheDocument();
  });

  it("displays product prices formatted correctly", () => {
    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    expect(screen.getByText("$25,000")).toBeInTheDocument();
    expect(screen.getByText("$22,000")).toBeInTheDocument();
    expect(screen.getByText("$35,000")).toBeInTheDocument();
  });

  it("displays submitted dates formatted correctly", () => {
    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Dates will be formatted as locale strings
    expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/1\/16\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/1\/17\/2024/)).toBeInTheDocument();
  });

  it("renders header checkbox with correct aria-label", () => {
    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const headerCheckbox = screen.getByLabelText("Seleccionar todos");
    expect(headerCheckbox).toBeInTheDocument();
  });

  it("renders individual checkboxes with product-specific aria-labels", () => {
    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    expect(
      screen.getByLabelText("Seleccionar 2020 Toyota Camry"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Seleccionar 2019 Honda Accord"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Seleccionar 2021 Ford F-150"),
    ).toBeInTheDocument();
  });

  it("selects individual product when checkbox is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const checkbox = screen.getByLabelText("Seleccionar 2020 Toyota Camry");
    await user.click(checkbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(new Set(["product-1"]));
  });

  it("deselects individual product when already selected", async () => {
    const user = userEvent.setup();

    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set(["product-1"])}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const checkbox = screen.getByLabelText("Seleccionar 2020 Toyota Camry");
    await user.click(checkbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("selects all products when header checkbox is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const headerCheckbox = screen.getByLabelText("Seleccionar todos");
    await user.click(headerCheckbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(
      new Set(["product-1", "product-2", "product-3"]),
    );
  });

  it("deselects all products when header checkbox is clicked and all are selected", async () => {
    const user = userEvent.setup();

    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set(["product-1", "product-2", "product-3"])}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const headerCheckbox = screen.getByLabelText("Seleccionar todos");
    await user.click(headerCheckbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("shows header checkbox as checked when all products are selected", () => {
    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set(["product-1", "product-2", "product-3"])}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const headerCheckbox = screen.getByLabelText("Seleccionar todos");
    expect(headerCheckbox).toBeChecked();
  });

  it("shows individual checkbox as checked when product is selected", () => {
    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set(["product-1"])}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const checkbox = screen.getByLabelText("Seleccionar 2020 Toyota Camry");
    expect(checkbox).toBeChecked();
  });

  it("handles multiple selections correctly", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Select first product
    const checkbox1 = screen.getByLabelText("Seleccionar 2020 Toyota Camry");
    await user.click(checkbox1);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(new Set(["product-1"]));

    // Simulate parent component updating selectedIds
    rerender(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set(["product-1"])}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Select second product
    const checkbox2 = screen.getByLabelText("Seleccionar 2019 Honda Accord");
    await user.click(checkbox2);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(
      new Set(["product-1", "product-2"]),
    );
  });

  it("renders empty table when no products", () => {
    const { container } = render(
      <ReviewQueueTable
        products={[]}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const tbody = container.querySelector("tbody");
    expect(tbody?.children.length).toBe(0);
  });

  it("displays product ID (first 8 chars) as subtitle", () => {
    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Should have 3 product ID subtitles (one per product)
    const productIds = screen.getAllByText(/product-/);
    expect(productIds).toHaveLength(3);
  });

  it("displays dash when submitted_for_approval_at is null", () => {
    const productWithoutDate: Product = {
      ...mockProducts[0],
      id: "product-4",
      submitted_for_approval_at: null as any,
    };

    render(
      <ReviewQueueTable
        products={[productWithoutDate]}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders product images with correct dimensions", () => {
    const { container } = render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const images = container.querySelectorAll("img");
    // Should have 2 images (product-1 and product-2, product-3 has no images)
    expect(images.length).toBe(2);

    images.forEach((img) => {
      expect(img).toHaveAttribute("width", "48");
      expect(img).toHaveAttribute("height", "48");
    });
  });

  it("applies hover styles to table rows", () => {
    const { container } = render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const rows = container.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      expect(row).toHaveClass("hover:bg-ps-elevated");
    });
  });

  it("keyboard navigation: Space key toggles checkbox", async () => {
    const user = userEvent.setup();

    render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const checkbox = screen.getByLabelText("Seleccionar 2020 Toyota Camry");
    checkbox.focus();

    await user.keyboard(" "); // Space key

    expect(mockOnSelectionChange).toHaveBeenCalledWith(new Set(["product-1"]));
  });

  it("maintains selection when products order changes", () => {
    const { rerender } = render(
      <ReviewQueueTable
        products={mockProducts}
        selectedIds={new Set(["product-2"])}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const checkbox = screen.getByLabelText("Seleccionar 2019 Honda Accord");
    expect(checkbox).toBeChecked();

    // Rerender with reversed product order
    const reversedProducts = [...mockProducts].reverse();
    rerender(
      <ReviewQueueTable
        products={reversedProducts}
        selectedIds={new Set(["product-2"])}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const checkboxAfter = screen.getByLabelText(
      "Seleccionar 2019 Honda Accord",
    );
    expect(checkboxAfter).toBeChecked();
  });
});
