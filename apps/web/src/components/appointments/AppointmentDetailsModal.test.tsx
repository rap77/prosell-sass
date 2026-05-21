/**
 * Tests for AppointmentDetailsModal component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppointmentDetailsModal } from "./AppointmentDetailsModal";
import { AppointmentStatus } from "@/lib/api/appointments";
import { Lead } from "@/lib/api/leads";

// Mock the leads API
vi.mock("@/lib/api/leads", () => ({
  useLead: vi.fn(),
  LeadStatus: {
    NEW: "new",
    CONTACTED: "contacted",
    QUALIFIED: "qualified",
    APPOINTMENT_SET: "appointment_set",
    LOST: "lost",
  },
}));

// Mock the appointments API
vi.mock("@/lib/api/appointments", () => ({
  AppointmentStatus: {
    SCHEDULED: "scheduled",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  },
  useUpdateAppointmentStatus: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

import { useLead } from "@/lib/api/leads";

describe("AppointmentDetailsModal", () => {
  const mockAppointment = {
    id: "apt-123",
    tenant_id: "tenant-1",
    lead_id: "lead-456",
    user_id: "branch-789",
    product_id: "vehicle-101",
    scheduled_at: "2026-05-15T14:30:00Z",
    status: AppointmentStatus.SCHEDULED,
    notes: "Interested in the SUV",
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-01T10:00:00Z",
  };

  const mockLead: Lead = {
    id: "lead-456",
    buyer_name: "John Doe",
    buyer_email: "john@example.com",
    buyer_phone: "+1-555-0123",
    product_id: "product-101",
    product: {
      id: "product-101",
      title: "2024 Toyota RAV4",
      price_cents: 3500000,
      currency: "USD",
      status: "active",
      attributes: { category: "vehicle", year: 2024, make: "Toyota", model: "RAV4" },
      created_at: "2026-05-01T10:00:00Z",
      updated_at: "2026-05-01T10:00:00Z",
    },
    message: "I'm interested in this vehicle",
    status: "appointment_set" as any,
    source: "facebook",
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-01T10:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render appointment details when open", async () => {
    (useLead as any).mockReturnValue({
      data: mockLead,
      isLoading: false,
    });

    render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Detalle del turno")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("+1-555-0123")).toBeInTheDocument();
      expect(screen.getByText(/2024 Toyota RAV4/)).toBeInTheDocument();
      expect(screen.getByText("Interested in the SUV")).toBeInTheDocument();
    });
  });

  it("should show loading state while fetching lead", () => {
    (useLead as any).mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText("Cargando datos del lead...")).toBeInTheDocument();
  });

  it("should show error when lead not found", () => {
    (useLead as any).mockReturnValue({
      data: null,
      isLoading: false,
    });

    render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText("No se encontró información del lead")).toBeInTheDocument();
  });

  it("should not render when appointment is null", () => {
    (useLead as any).mockReturnValue({
      data: mockLead,
      isLoading: false,
    });

    const { container } = render(
      <AppointmentDetailsModal
        appointment={null}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should not render when open is false", () => {
    (useLead as any).mockReturnValue({
      data: mockLead,
      isLoading: false,
    });

    const { container } = render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        open={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should display confirm and cancel buttons for scheduled appointments", async () => {
    (useLead as any).mockReturnValue({
      data: mockLead,
      isLoading: false,
    });

    render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("confirm-button")).toBeInTheDocument();
      expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
    });
  });

  it("should not show action buttons for completed appointments", async () => {
    (useLead as any).mockReturnValue({
      data: mockLead,
      isLoading: false,
    });

    const completedAppointment = {
      ...mockAppointment,
      status: AppointmentStatus.COMPLETED,
    };

    render(
      <AppointmentDetailsModal
        appointment={completedAppointment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId("confirm-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
    });
  });

  it("should not show action buttons for cancelled appointments", async () => {
    (useLead as any).mockReturnValue({
      data: mockLead,
      isLoading: false,
    });

    const cancelledAppointment = {
      ...mockAppointment,
      status: AppointmentStatus.CANCELLED,
    };

    render(
      <AppointmentDetailsModal
        appointment={cancelledAppointment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId("confirm-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
    });
  });

  it("should handle appointment without vehicle", async () => {
    (useLead as any).mockReturnValue({
      data: {
        ...mockLead,
        product: null,
      },
      isLoading: false,
    });

    render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Vehículo no disponible")).toBeInTheDocument();
    });
  });

  it("should format date and time correctly", async () => {
    (useLead as any).mockReturnValue({
      data: mockLead,
      isLoading: false,
    });

    render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/15 de May 2026/)).toBeInTheDocument();
      // Time is in 24h format (HH:mm)
      expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
    });
  });

  it("should call onOpenChange when closed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    (useLead as any).mockReturnValue({
      data: mockLead,
      isLoading: false,
    });

    render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Detalle del turno")).toBeInTheDocument();
    });

    // Click the close button (X icon)
    const closeButton = screen.getByRole("button", { name: /Cerrar/i });
    await user.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should display notes when present", async () => {
    (useLead as any).mockReturnValue({
      data: mockLead,
      isLoading: false,
    });

    render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Interested in the SUV")).toBeInTheDocument();
    });
  });

  it("should not display notes section when notes are null", async () => {
    (useLead as any).mockReturnValue({
      data: mockLead,
      isLoading: false,
    });

    const appointmentWithoutNotes = {
      ...mockAppointment,
      notes: null,
    };

    render(
      <AppointmentDetailsModal
        appointment={appointmentWithoutNotes}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Interested in/)).not.toBeInTheDocument();
    });
  });
});
