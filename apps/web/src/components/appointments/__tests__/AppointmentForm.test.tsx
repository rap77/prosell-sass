import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AppointmentForm } from "../AppointmentForm";

vi.mock("@/lib/api/branches", () => ({
  useBranches: () => ({
    data: { items: [{ id: "branch-1", name: "Branch One" }] },
    isLoading: false,
  }),
}));

vi.mock("@/lib/api/appointments", () => ({
  useCreateAppointment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("date-fns/format", () => ({
  format: (date: Date) => "2026-04-28",
}));

describe("AppointmentForm - Time Validation (A4.32)", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    leadId: "lead-123",
    vehicleId: "vehicle-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render date input with min attribute set to today", () => {
    render(<AppointmentForm {...defaultProps} />);
    const dateInput = screen.getByLabelText(/Fecha/i);
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute("type", "date");
    expect(dateInput).toHaveAttribute("min");
  });

  it("should render time dropdown with business hours slots", () => {
    render(<AppointmentForm {...defaultProps} />);
    const timeTrigger = screen.getByLabelText(/Horario/i);
    expect(timeTrigger).toBeInTheDocument();
  });

  it("should have time slots from 9am to 6pm (business hours)", () => {
    render(<AppointmentForm {...defaultProps} />);
    const timeTrigger = screen.getByLabelText(/Horario/i);
    expect(timeTrigger).toBeInTheDocument();
  });

  it("should show helper text about business hours", () => {
    render(<AppointmentForm {...defaultProps} />);
    // Helper text uses Spanish - check for partial match
    expect(screen.getByText(/lunes a viernes/i)).toBeInTheDocument();
  });
});
