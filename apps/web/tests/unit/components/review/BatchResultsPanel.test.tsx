import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BatchResultsPanel } from "@/components/review/BatchResultsPanel";
import type { BatchReviewResponse } from "@/lib/api/products";

describe("BatchResultsPanel", () => {
  let mockOnDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnDismiss = vi.fn();
  });

  it("renders panel with success and failed counts", () => {
    const results: BatchReviewResponse = {
      results: [],
      approved_count: 5,
      rejected_count: 3,
      failed_count: 2,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("Resultado de la operación")).toBeInTheDocument();
    expect(screen.getByText("8 exitosos, 2 fallaron")).toBeInTheDocument();
  });

  it("calculates success count correctly (approved + rejected)", () => {
    const results: BatchReviewResponse = {
      results: [],
      approved_count: 10,
      rejected_count: 5,
      failed_count: 0,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("15 exitosos, 0 fallaron")).toBeInTheDocument();
  });

  it("renders dismiss button (X icon)", () => {
    const results: BatchReviewResponse = {
      results: [],
      approved_count: 5,
      rejected_count: 0,
      failed_count: 0,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    const dismissButton = screen.getByRole("button");
    expect(dismissButton).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    const user = userEvent.setup();

    const results: BatchReviewResponse = {
      results: [],
      approved_count: 5,
      rejected_count: 0,
      failed_count: 0,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    const dismissButton = screen.getByRole("button");
    await user.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not show error section when no failures", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "product-1",
          status: "approved",
        },
        {
          product_id: "product-2",
          status: "rejected",
        },
      ],
      approved_count: 1,
      rejected_count: 1,
      failed_count: 0,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    expect(screen.queryByText("Productos con error:")).not.toBeInTheDocument();
  });

  it("shows error section when there are failures", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "product-1",
          status: "failed",
          error_code: "invalid_transition",
          message: "Product is not in pending status",
        },
      ],
      approved_count: 0,
      rejected_count: 0,
      failed_count: 1,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("Productos con error:")).toBeInTheDocument();
  });

  it("displays product ID for failed items", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "abc123-def456",
          status: "failed",
          message: "Product not found",
        },
      ],
      approved_count: 0,
      rejected_count: 0,
      failed_count: 1,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("abc123-def456")).toBeInTheDocument();
  });

  it("displays error message for failed items", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "product-1",
          status: "failed",
          message: "Product is not in pending status",
        },
      ],
      approved_count: 0,
      rejected_count: 0,
      failed_count: 1,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    expect(
      screen.getByText("Product is not in pending status"),
    ).toBeInTheDocument();
  });

  it("shows multiple failed items", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "product-1",
          status: "failed",
          message: "Error 1",
        },
        {
          product_id: "product-2",
          status: "approved",
        },
        {
          product_id: "product-3",
          status: "failed",
          message: "Error 2",
        },
      ],
      approved_count: 1,
      rejected_count: 0,
      failed_count: 2,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("product-1")).toBeInTheDocument();
    expect(screen.getByText("Error 1")).toBeInTheDocument();
    expect(screen.getByText("product-3")).toBeInTheDocument();
    expect(screen.getByText("Error 2")).toBeInTheDocument();

    // Should not show approved product
    expect(screen.queryByText("product-2")).not.toBeInTheDocument();
  });

  it("renders as fixed panel in bottom-right", () => {
    const results: BatchReviewResponse = {
      results: [],
      approved_count: 5,
      rejected_count: 0,
      failed_count: 0,
    };

    const { container } = render(
      <BatchResultsPanel results={results} onDismiss={mockOnDismiss} />,
    );

    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass("fixed", "bottom-20", "right-4");
  });

  it("has max-height with scroll for error list", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "product-1",
          status: "failed",
          message: "Error 1",
        },
      ],
      approved_count: 0,
      rejected_count: 0,
      failed_count: 1,
    };

    const { container } = render(
      <BatchResultsPanel results={results} onDismiss={mockOnDismiss} />,
    );

    const errorList = container.querySelector(".max-h-64");
    expect(errorList).toBeInTheDocument();
    expect(errorList).toHaveClass("overflow-y-auto");
  });

  it("product IDs are displayed in monospace font", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "product-1",
          status: "failed",
          message: "Error",
        },
      ],
      approved_count: 0,
      rejected_count: 0,
      failed_count: 1,
    };

    const { container } = render(
      <BatchResultsPanel results={results} onDismiss={mockOnDismiss} />,
    );

    const productId = screen.getByText("product-1");
    expect(productId).toHaveClass("font-mono");
  });

  it("error messages have red color styling", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "product-1",
          status: "failed",
          message: "Something went wrong",
        },
      ],
      approved_count: 0,
      rejected_count: 0,
      failed_count: 1,
    };

    const { container } = render(
      <BatchResultsPanel results={results} onDismiss={mockOnDismiss} />,
    );

    const errorMessage = screen.getByText("Something went wrong");
    expect(errorMessage).toHaveClass("text-red-600", "dark:text-red-400");
  });

  it("handles partial success scenario correctly", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "product-1",
          status: "approved",
        },
        {
          product_id: "product-2",
          status: "rejected",
        },
        {
          product_id: "product-3",
          status: "failed",
          message: "Invalid state",
        },
      ],
      approved_count: 1,
      rejected_count: 1,
      failed_count: 1,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    // Shows correct counts
    expect(screen.getByText("2 exitosos, 1 fallaron")).toBeInTheDocument();

    // Shows only failed item details
    expect(screen.getByText("product-3")).toBeInTheDocument();
    expect(screen.getByText("Invalid state")).toBeInTheDocument();

    // Doesn't show successful items in error list
    expect(screen.queryByText("product-1")).not.toBeInTheDocument();
    expect(screen.queryByText("product-2")).not.toBeInTheDocument();
  });

  it("handles all failed scenario", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "product-1",
          status: "failed",
          message: "Error 1",
        },
        {
          product_id: "product-2",
          status: "failed",
          message: "Error 2",
        },
      ],
      approved_count: 0,
      rejected_count: 0,
      failed_count: 2,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("0 exitosos, 2 fallaron")).toBeInTheDocument();
    expect(screen.getByText("product-1")).toBeInTheDocument();
    expect(screen.getByText("product-2")).toBeInTheDocument();
  });

  it("handles all success scenario (no errors to display)", () => {
    const results: BatchReviewResponse = {
      results: [
        {
          product_id: "product-1",
          status: "approved",
        },
        {
          product_id: "product-2",
          status: "approved",
        },
      ],
      approved_count: 2,
      rejected_count: 0,
      failed_count: 0,
    };

    render(<BatchResultsPanel results={results} onDismiss={mockOnDismiss} />);

    expect(screen.getByText("2 exitosos, 0 fallaron")).toBeInTheDocument();
    expect(screen.queryByText("Productos con error:")).not.toBeInTheDocument();
  });
});
