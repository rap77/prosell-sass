/**
 * AppointmentCard component tests
 *
 * Test coverage:
 * - Displays buyer name
 * - Displays vehicle information (make, model, year)
 * - Displays formatted scheduled time
 * - Displays status badge
 * - Handles click interaction
 * - Responsive design classes
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppointmentCard } from "./AppointmentCard";
import { Appointment, AppointmentStatus } from "@/lib/api/appointments";
import { Lead } from "@/lib/api/leads";

describe("AppointmentCard", () => {
  const mockLead: Lead = {
    id: "lead-1",
    buyer_name: "John Doe",
    buyer_email: "john@example.com",
    buyer_phone: "+1234567890",
    product_id: "product-1",
    product: {
      id: "product-1",
      title: "2021 Toyota Camry",
      price_cents: 2100000,
      currency: "USD",
      status: "active",
      attributes: { category: "vehicle", year: 2021, make: "Toyota", model: "Camry" },
      created_at: "2026-04-29T09:00:00Z",
      updated_at: "2026-04-29T09:00:00Z",
    },
    message: "Interested in this vehicle",
    status: "new" as any,
    source: "facebook",
    created_at: "2026-04-29T09:00:00Z",
    updated_at: "2026-04-29T09:00:00Z",
  };

  const mockAppointment: Appointment = {
    id: "apt-1",
    tenant_id: "tenant-1",
    lead_id: "lead-1",
    user_id: "branch-1",
    product_id: "vehicle-1",
    scheduled_at: "2026-04-29T14:00:00Z",
    status: AppointmentStatus.SCHEDULED,
    notes: "Test appointment",
    created_at: "2026-04-29T09:00:00Z",
    updated_at: "2026-04-29T09:00:00Z",
  };

  it("should display buyer name", () => {
    render(<AppointmentCard appointment={mockAppointment} lead={mockLead} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should display vehicle information", () => {
    render(<AppointmentCard appointment={mockAppointment} lead={mockLead} />);

    expect(screen.getByText("2021 Toyota Camry")).toBeInTheDocument();
  });

  it("should display formatted scheduled time", () => {
    const { container } = render(
      <AppointmentCard appointment={mockAppointment} lead={mockLead} />
    );

    // Should show time with Clock icon
    const clockIcon = container.querySelector("svg");
    expect(clockIcon).toBeInTheDocument();

    // Should show date
    expect(screen.getByText("Apr 29, 2026")).toBeInTheDocument();
  });

  it("should display status badge", () => {
    render(<AppointmentCard appointment={mockAppointment} lead={mockLead} />);

    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("should handle click interaction", () => {
    const handleClick = vi.fn();

    const { container } = render(
      <AppointmentCard
        appointment={mockAppointment}
        lead={mockLead}
        onClick={handleClick}
      />
    );

    const card = container.querySelector('[data-testid="appointment-card"]') as HTMLElement;
    card?.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should display completed status", () => {
    const completedAppointment = {
      ...mockAppointment,
      status: AppointmentStatus.COMPLETED,
    };

    render(
      <AppointmentCard appointment={completedAppointment} lead={mockLead} />
    );

    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("should display cancelled status", () => {
    const cancelledAppointment = {
      ...mockAppointment,
      status: AppointmentStatus.CANCELLED,
    };

    render(
      <AppointmentCard appointment={cancelledAppointment} lead={mockLead} />
    );

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("should handle missing vehicle gracefully", () => {
    const leadWithoutVehicle = {
      ...mockLead,
      product: null,
    };

    render(
      <AppointmentCard appointment={mockAppointment} lead={leadWithoutVehicle} />
    );

    expect(screen.getByText("Vehicle not available")).toBeInTheDocument();
  });

  it("should apply responsive design classes", () => {
    const { container } = render(
      <AppointmentCard appointment={mockAppointment} lead={mockLead} />
    );

    const card = container.querySelector('[data-testid="appointment-card"]');
    expect(card).toHaveClass("hover:shadow-md");
    expect(card).toHaveClass("transition-shadow");
  });

  it("should show confirm and cancel buttons for scheduled appointments", () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <AppointmentCard
        appointment={mockAppointment}
        lead={mockLead}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("should not show buttons for completed appointments", () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();
    const completedAppointment = {
      ...mockAppointment,
      status: AppointmentStatus.COMPLETED,
    };

    render(
      <AppointmentCard
        appointment={completedAppointment}
        lead={mockLead}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  it("should not show buttons for cancelled appointments", () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();
    const cancelledAppointment = {
      ...mockAppointment,
      status: AppointmentStatus.CANCELLED,
    };

    render(
      <AppointmentCard
        appointment={cancelledAppointment}
        lead={mockLead}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    const handleConfirm = vi.fn();
    const eventStopPropagation = vi.fn();

    render(
      <AppointmentCard
        appointment={mockAppointment}
        lead={mockLead}
        onConfirm={handleConfirm}
      />
    );

    const confirmButton = screen.getByText("Confirm");
    confirmButton.click();

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when cancel button is clicked", () => {
    const handleCancel = vi.fn();

    render(
      <AppointmentCard
        appointment={mockAppointment}
        lead={mockLead}
        onCancel={handleCancel}
      />
    );

    const cancelButton = screen.getByText("Cancel");
    cancelButton.click();

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it("should stop propagation when action buttons are clicked", () => {
    const handleCardClick = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <AppointmentCard
        appointment={mockAppointment}
        lead={mockLead}
        onClick={handleCardClick}
        onConfirm={handleConfirm}
      />
    );

    const confirmButton = screen.getByText("Confirm");
    confirmButton.click();

    // Card click should not be triggered when button is clicked
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleCardClick).not.toHaveBeenCalled();
  });
});
