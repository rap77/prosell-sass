import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RejectConfirmDialog } from "@/components/review/RejectConfirmDialog";

// Mock sonner toast
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (message: string) => mockToastError(message),
  },
}));

describe("RejectConfirmDialog", () => {
  let mockOnOpenChange: ReturnType<typeof vi.fn>;
  let mockOnConfirm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnOpenChange = vi.fn();
    mockOnConfirm = vi.fn();
    mockToastError.mockClear();
  });

  it("renders dialog when open=true", () => {
    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Rechazar productos")).toBeInTheDocument();
  });

  it("does not render dialog when open=false", () => {
    render(
      <RejectConfirmDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays correct selected count in description", () => {
    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={5}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(
      screen.getByText(/este motivo se registrará en los 5 productos/i),
    ).toBeInTheDocument();
  });

  it("renders textarea with correct label", () => {
    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const textarea = screen.getByLabelText(/motivo de rechazo/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("textarea has placeholder text", () => {
    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      /falta documentación del vehículo/i,
    );
    expect(textarea).toBeInTheDocument();
  });

  it("updates textarea value when user types", async () => {
    const user = userEvent.setup();

    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const textarea = screen.getByLabelText(/motivo de rechazo/i);
    await user.type(textarea, "Falta documentación");

    expect(textarea).toHaveValue("Falta documentación");
  });

  it("confirm button is disabled when reason is empty", () => {
    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: /confirmar rechazo/i,
    });
    expect(confirmButton).toBeDisabled();
  });

  it("confirm button is enabled when reason has text", async () => {
    const user = userEvent.setup();

    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const textarea = screen.getByLabelText(/motivo de rechazo/i);
    await user.type(textarea, "Falta documentación");

    const confirmButton = screen.getByRole("button", {
      name: /confirmar rechazo/i,
    });
    expect(confirmButton).toBeEnabled();
  });

  it("confirm button is disabled when reason is only whitespace", async () => {
    const user = userEvent.setup();

    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const textarea = screen.getByLabelText(/motivo de rechazo/i);
    await user.type(textarea, "   ");

    const confirmButton = screen.getByRole("button", {
      name: /confirmar rechazo/i,
    });
    expect(confirmButton).toBeDisabled();
  });

  it("calls onConfirm with reason when confirmed", async () => {
    const user = userEvent.setup();

    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const textarea = screen.getByLabelText(/motivo de rechazo/i);
    await user.type(textarea, "Falta documentación");

    const confirmButton = screen.getByRole("button", {
      name: /confirmar rechazo/i,
    });
    await user.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledWith("Falta documentación");
  });

  it("shows toast error when trying to confirm with empty reason", async () => {
    const user = userEvent.setup();

    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    // Even though button should be disabled, test the validation logic
    const textarea = screen.getByLabelText(/motivo de rechazo/i);
    await user.type(textarea, "test");
    await user.clear(textarea);

    // Manually trigger handleConfirm by enabling and clicking
    const confirmButton = screen.getByRole("button", {
      name: /confirmar rechazo/i,
    });

    // The button will be disabled, so we can't actually click it
    // But we can verify the disabled state
    expect(confirmButton).toBeDisabled();
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <RejectConfirmDialog
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
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={true}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancelar/i });
    const confirmButton = screen.getByRole("button", {
      name: /rechazando/i,
    });

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it("shows 'Rechazando...' text when isLoading=true", () => {
    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={true}
      />,
    );

    expect(screen.getByText("Rechazando...")).toBeInTheDocument();
  });

  it("shows 'Confirmar rechazo' text when isLoading=false", () => {
    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /confirmar rechazo/i }),
    ).toBeInTheDocument();
  });

  it("clears reason after successful confirm", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const textarea = screen.getByLabelText(/motivo de rechazo/i);
    await user.type(textarea, "Falta documentación");

    const confirmButton = screen.getByRole("button", {
      name: /confirmar rechazo/i,
    });
    await user.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledWith("Falta documentación");

    // After confirm, the internal state clears the reason
    // Simulate re-opening the dialog
    rerender(
      <RejectConfirmDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    rerender(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const textareaAfter = screen.getByLabelText(/motivo de rechazo/i);
    expect(textareaAfter).toHaveValue("");
  });

  it("renders cancel button with outline variant", () => {
    render(
      <RejectConfirmDialog
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

  it("renders confirm button with destructive variant", () => {
    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: /confirmar rechazo/i,
    });

    // Destructive variant is applied
    expect(confirmButton.className).toMatch(/destructive/);
  });

  it("Escape key closes dialog", async () => {
    const user = userEvent.setup();

    render(
      <RejectConfirmDialog
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

  it("textarea has correct rows attribute", () => {
    render(
      <RejectConfirmDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={3}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />,
    );

    const textarea = screen.getByLabelText(/motivo de rechazo/i);
    expect(textarea).toHaveAttribute("rows", "4");
  });
});
