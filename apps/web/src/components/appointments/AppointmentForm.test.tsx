/**
 * AppointmentForm modal tests
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AppointmentForm } from "./AppointmentForm";
import { useBranches } from "@/lib/api/branches";
import { useCreateAppointment } from "@/lib/api/appointments";

// Mock branches API
vi.mock("@/lib/api/branches", () => ({
  useBranches: vi.fn(),
}));

// Mock appointments API
vi.mock("@/lib/api/appointments", () => ({
  useCreateAppointment: vi.fn(),
}));

describe("AppointmentForm", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const leadId = "test-lead-123";

  const mockBranches = [
    { id: "branch-1", name: "Branch One", email: "branch1@example.com" },
    { id: "branch-2", name: "Branch Two", email: "branch2@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useBranches as vi.Mock).mockReturnValue({
      data: mockBranches,
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

      expect(screen.getByLabelText(/Branch/i)).toBeInTheDocument();
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
        expect(screen.getByText(/User is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Date is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Time is required/i)).toBeInTheDocument();
      });
    });
  });

  describe("Slice 3: Form submission", () => {
    it("should have submit button disabled while creating", () => {
      (useCreateAppointment as vi.Mock).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({ id: "apt-123" }),
        isPending: true,
        error: null,
      });

      render(
        <AppointmentForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          leadId={leadId}
        />
      );

      const submitButton = screen.getByRole("button", { name: /Schedule/i });
      expect(submitButton).toBeDisabled();
    });

    it("should show loading spinner when creating appointment", () => {
      (useCreateAppointment as vi.Mock).mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({ id: "apt-123" }),
        isPending: true,
        error: null,
      });

      render(
        <AppointmentForm
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          leadId={leadId}
        />
      );

      // Check for loading spinner
      const submitButton = screen.getByRole("button", { name: /Schedule/i });
      expect(submitButton.innerHTML).toContain("svg");
    });
  });
});
