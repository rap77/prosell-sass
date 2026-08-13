import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BatchActionBar } from "@/components/review/BatchActionBar";

describe("BatchActionBar", () => {
  let mockOnClear: ReturnType<typeof vi.fn>;
  let mockOnApprove: ReturnType<typeof vi.fn>;
  let mockOnReject: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClear = vi.fn();
    mockOnApprove = vi.fn();
    mockOnReject = vi.fn();
  });

  it("renders with correct selected count (singular)", () => {
    render(
      <BatchActionBar
        selectedCount={1}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    expect(screen.getByText("1 producto seleccionado")).toBeInTheDocument();
  });

  it("renders with correct selected count (plural)", () => {
    render(
      <BatchActionBar
        selectedCount={5}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    expect(screen.getByText("5 productos seleccionados")).toBeInTheDocument();
  });

  it("renders all three action buttons", () => {
    render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /limpiar selección/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /rechazar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /aprobar/i }),
    ).toBeInTheDocument();
  });

  it("calls onClear when Limpiar selección is clicked", async () => {
    const user = userEvent.setup();

    render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    const clearButton = screen.getByRole("button", {
      name: /limpiar selección/i,
    });
    await user.click(clearButton);

    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it("calls onReject when Rechazar is clicked", async () => {
    const user = userEvent.setup();

    render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    const rejectButton = screen.getByRole("button", { name: /rechazar/i });
    await user.click(rejectButton);

    expect(mockOnReject).toHaveBeenCalledTimes(1);
  });

  it("calls onApprove when Aprobar is clicked", async () => {
    const user = userEvent.setup();

    render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    const approveButton = screen.getByRole("button", { name: /aprobar/i });
    await user.click(approveButton);

    expect(mockOnApprove).toHaveBeenCalledTimes(1);
  });

  it("disables all buttons when isLoading=true", () => {
    render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={true}
      />,
    );

    const clearButton = screen.getByRole("button", {
      name: /limpiar selección/i,
    });
    const rejectButton = screen.getByRole("button", { name: /rechazar/i });
    const approveButton = screen.getByRole("button", { name: /procesando/i });

    expect(clearButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
    expect(approveButton).toBeDisabled();
  });

  it("shows 'Procesando...' text on Aprobar button when loading", () => {
    render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={true}
      />,
    );

    expect(screen.getByText("Procesando...")).toBeInTheDocument();
  });

  it("shows 'Aprobar' text on button when not loading", () => {
    render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /^aprobar$/i }),
    ).toBeInTheDocument();
  });

  it("does not call callbacks when buttons are disabled (isLoading=true)", async () => {
    const user = userEvent.setup();

    render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={true}
      />,
    );

    const clearButton = screen.getByRole("button", {
      name: /limpiar selección/i,
    });
    const rejectButton = screen.getByRole("button", { name: /rechazar/i });
    const approveButton = screen.getByRole("button", { name: /procesando/i });

    await user.click(clearButton);
    await user.click(rejectButton);
    await user.click(approveButton);

    expect(mockOnClear).not.toHaveBeenCalled();
    expect(mockOnReject).not.toHaveBeenCalled();
    expect(mockOnApprove).not.toHaveBeenCalled();
  });

  it("renders as fixed bottom bar (accessibility)", () => {
    const { container } = render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    const actionBar = container.firstChild as HTMLElement;
    expect(actionBar).toHaveClass("fixed", "bottom-0", "left-0", "right-0");
  });

  it("has proper touch targets (min 44px) - buttons have padding", () => {
    const { container } = render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    // Buttons should have adequate padding for touch
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(3);

    // All buttons have padding from the Button component
    buttons.forEach((button) => {
      expect(button.className).toMatch(/p-|px-|py-/);
    });
  });

  it("updates count when selectedCount prop changes", () => {
    const { rerender } = render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    expect(screen.getByText("3 productos seleccionados")).toBeInTheDocument();

    rerender(
      <BatchActionBar
        selectedCount={10}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    expect(screen.getByText("10 productos seleccionados")).toBeInTheDocument();
  });

  it("uses correct styling classes for primary action (Aprobar)", () => {
    render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    const approveButton = screen.getByRole("button", { name: /aprobar/i });

    // Primary button should have ps-cyan background
    expect(approveButton).toHaveClass("bg-ps-cyan", "text-ps-base");
  });

  it("uses correct styling classes for secondary actions (Limpiar, Rechazar)", () => {
    render(
      <BatchActionBar
        selectedCount={3}
        onClear={mockOnClear}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        isLoading={false}
      />,
    );

    const clearButton = screen.getByRole("button", {
      name: /limpiar selección/i,
    });
    const rejectButton = screen.getByRole("button", { name: /rechazar/i });

    // Secondary buttons should have outline variant
    expect(clearButton.className).toContain("border-ps-border-default");
    expect(rejectButton.className).toContain("border-ps-border-default");
  });
});
