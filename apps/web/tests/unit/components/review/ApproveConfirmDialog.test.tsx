import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApproveConfirmDialog } from "@/components/review/ApproveConfirmDialog";

describe("ApproveConfirmDialog", () => {
  let mockOnOpenChange: ReturnType<typeof vi.fn>;
  let mockOnConfirm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnOpenChange = vi.fn();
    mockOnConfirm = vi.fn();
  });

  it("renders dialog when open=true", () => {
    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Aprobar productos")).toBeInTheDocument();
  });

  it("does not render dialog when open=false", () => {
    render(
      <ApproveConfirmDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays correct count with singular form (1 producto)", () => {
    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={1}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/vas a aprobar 1 producto/i)).toBeInTheDocument();
  });

  it("displays correct count with plural form (N productos)", () => {
    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={5}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/vas a aprobar 5 productos/i)).toBeInTheDocument();
  });

  it("displays description text about catalog availability", () => {
    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(
      screen.getByText(
        /los productos aprobados estarán disponibles en el catálogo de prosell/i,
      ),
    ).toBeInTheDocument();
  });

  it("calls onConfirm when Confirmar aprobación is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: /confirmar aprobación/i,
    });
    await user.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange(false) when Cancelar is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancelar/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables both buttons when isLoading=true", () => {
    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={true}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancelar/i });
    const confirmButton = screen.getByRole("button", { name: /aprobando/i });

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it("shows 'Aprobando...' text when isLoading=true", () => {
    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={true}
      />,
    );

    expect(screen.getByText("Aprobando...")).toBeInTheDocument();
  });

  it("shows 'Confirmar aprobación' text when isLoading=false", () => {
    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /confirmar aprobación/i }),
    ).toBeInTheDocument();
  });

  it("does not call callbacks when buttons are disabled (isLoading=true)", async () => {
    const user = userEvent.setup();

    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={true}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancelar/i });
    const confirmButton = screen.getByRole("button", { name: /aprobando/i });

    await user.click(cancelButton);
    await user.click(confirmButton);

    expect(mockOnOpenChange).not.toHaveBeenCalled();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("renders cancel button with outline variant", () => {
    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancelar/i });
    expect(cancelButton.className).toContain("border-ps-border-default");
  });

  it("renders confirm button with primary (ps-cyan) styling", () => {
    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: /confirmar aprobación/i,
    });
    expect(confirmButton).toHaveClass("bg-ps-cyan", "text-ps-base");
  });

  it("Escape key closes dialog", async () => {
    const user = userEvent.setup();

    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    await user.keyboard("{Escape}");

    // Dialog component should call onOpenChange(false) on Escape
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("updates count text when selectedCount prop changes", () => {
    const { rerender } = render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/vas a aprobar 3 productos/i)).toBeInTheDocument();

    rerender(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={10}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/vas a aprobar 10 productos/i)).toBeInTheDocument();
  });

  it("confirm button is always enabled when not loading (no validation)", () => {
    render(
      <ApproveConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: /confirmar aprobación/i,
    });

    // Unlike RejectConfirmDialog, this has no validation
    expect(confirmButton).toBeEnabled();
  });
});
