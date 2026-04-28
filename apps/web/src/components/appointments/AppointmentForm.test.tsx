/**
 * AppointmentForm modal tests
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AppointmentForm } from "./AppointmentForm";
import { useDealers } from "@/lib/api/dealers";
import { useCreateAppointment } from "@/lib/api/appointments";

// Mock dealers API
vi.mock("@/lib/api/dealers", () => ({
  useDealers: vi.fn(),
}));

// Mock appointments API
vi.mock("@/lib/api/appointments", () => ({
  useCreateAppointment: vi.fn(),
}));

describe("AppointmentForm", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const leadId = "test-lead-123";

  const mockDealers = [
    { id: "dealer-1", name: "Dealer One", email: "dealer1@example.com" },
    { id: "dealer-2", name: "Dealer Two", email: "dealer2@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useDealers as vi.Mock).mockReturnValue({
      data: mockDealers,
      isLoading: false,
      error: null,
    });
    (useCreateAppointment as vi.Mock).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: "apt-123" }),
      isPending: false,
      error: null,
    });
  });

  describe("Slice 1: Basic modal structure", () => {
    it("should render modal when open", () => {
      render(
        <AppointmentForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          leadId={leadId}
        />
      );

      expect(screen.getByText(/Schedule Appointment/i)).toBeInTheDocument();
    });

    it("should not render modal when closed", () => {
      render(
        <AppointmentForm
          open={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          leadId={leadId}
        />
      );

      expect(screen.queryByText(/Schedule Appointment/i)).not.toBeInTheDocument();
    });

    it("should display form fields", () => {
      render(
        <AppointmentForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          leadId={leadId}
        />
      );

      expect(screen.getByLabelText(/Dealer/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
    });
  });

  describe("Slice 2: Form validation", () => {
    it("should show validation errors for required fields", async () => {
      render(
        <AppointmentForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          leadId={leadId}
        />
      );

      // Try to submit without filling fields
      const submitButton = screen.getByRole("button", { name: /Schedule/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Dealer is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Date is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Time is required/i)).toBeInTheDocument();
      });
    });
  });

  describe("Slice 3: Form submission", () => {
    it("should call createAppointment mutation with correct data", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: "apt-123" });
      (useCreateAppointment as vi.Mock).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null,
      });

      const { container } = render(
        <AppointmentForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          leadId={leadId}
        />
      );

      // Select dealer - click the trigger and then the option
      const dealerTrigger = screen.getByRole("combobox", { name: /dealer/i }) || container.querySelector('[role="combobox"]');
      if (dealerTrigger) {
        fireEvent.click(dealerTrigger);
        const dealerOption = await screen.findByText("Dealer One");
        fireEvent.click(dealerOption);
      }

      // Select date
      const dateInput = screen.getByLabelText(/Date/i);
      fireEvent.change(dateInput, { target: { value: "2026-05-01" } });

      // Select time - click the trigger and then the option
      const timeTrigger = screen.getAllByRole("combobox").find(el => el.textContent?.includes("Select a time"));
      if (timeTrigger) {
        fireEvent.click(timeTrigger);
        const timeOption = await screen.findByText("2:00 PM");
        fireEvent.click(timeOption);
      }

      // Add notes
      const notesInput = screen.getByLabelText(/Notes/i);
      fireEvent.change(notesInput, { target: { value: "Test appointment notes" } });

      // Submit form
      const submitButton = screen.getByRole("button", { name: /Schedule/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });
  });
});
