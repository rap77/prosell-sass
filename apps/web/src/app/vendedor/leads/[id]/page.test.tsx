/**
 * LeadDetails page tests
 */

import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRouter } from "next/navigation";
import { useLead } from "@/lib/api/leads";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock leads API
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

// Mock AppointmentForm component
vi.mock("@/components/appointments/AppointmentForm", () => ({
  AppointmentForm: ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    if (!open) return null;
    return (
      <div data-testid="appointment-form-modal">
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

describe("LeadDetails Page", () => {
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as vi.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
  });

  describe("Slice 1: Basic page structure and routing", () => {
    it("should render loading state when lead is being fetched", async () => {
      // Arrange: Mock loading state
      (useLead as vi.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      // Act & Assert: Page should render without errors
      await expect(async () => {
        await act(async () => {
          render(<LeadDetailsPage params={Promise.resolve({ id: "test-lead-123" })} />);
        });
      }).not.toThrow();
    });

    it("should display loading indicator", async () => {
      // Arrange: Mock loading state
      (useLead as vi.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      // Act
      await act(async () => {
        render(<LeadDetailsPage params={Promise.resolve({ id: "test-lead-123" })} />);
      });

      // Assert: Loading text should be visible
      expect(screen.getByText(/Loading lead details/i)).toBeInTheDocument();
    });

    it("should display error state when fetch fails", async () => {
      // Arrange: Mock error state
      const mockError = new Error("Failed to fetch lead");
      (useLead as vi.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
      });

      // Act
      await act(async () => {
        render(<LeadDetailsPage params={Promise.resolve({ id: "test-lead-123" })} />);
      });

      // Assert: Error message should be visible
      expect(screen.getByText(/Error loading lead/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch lead/i)).toBeInTheDocument();
    });

    it("should display not found state when lead is null", async () => {
      // Arrange: Mock not found state
      (useLead as vi.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      // Act
      await act(async () => {
        render(<LeadDetailsPage params={Promise.resolve({ id: "test-lead-123" })} />);
      });

      // Assert: Not found message should be visible
      expect(screen.getByText(/Lead not found/i)).toBeInTheDocument();
    });
  });

  describe("Slice 2: Lead details display", () => {
    it("should display lead information when data is loaded", async () => {
      // Arrange: Mock successful lead data
      const mockLead = {
        id: "test-lead-123",
        buyer_name: "John Doe",
        buyer_email: "john@example.com",
        buyer_phone: "+1-555-0123",
        product_id: null,
        product: null,
        message: "I'm interested in this vehicle",
        status: "new" as const,
        source: "facebook",
        created_at: "2026-04-28T12:00:00Z",
        updated_at: "2026-04-28T12:00:00Z",
      };

      (useLead as vi.Mock).mockReturnValue({
        data: mockLead,
        isLoading: false,
        error: null,
      });

      // Act
      await act(async () => {
        render(<LeadDetailsPage params={Promise.resolve({ id: "test-lead-123" })} />);
      });

      // Assert: Lead details should be visible
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("+1-555-0123")).toBeInTheDocument();
      expect(screen.getByText("I'm interested in this vehicle")).toBeInTheDocument();
      expect(screen.getByText(/facebook/i)).toBeInTheDocument();
    });

    it("should handle missing email and phone", async () => {
      // Arrange: Mock lead with missing optional fields
      const mockLead = {
        id: "test-lead-123",
        buyer_name: "Jane Smith",
        buyer_email: null,
        buyer_phone: null,
        product_id: null,
        product: null,
        message: null,
        status: "contacted" as const,
        source: "website",
        created_at: "2026-04-28T12:00:00Z",
        updated_at: "2026-04-28T12:00:00Z",
      };

      (useLead as vi.Mock).mockReturnValue({
        data: mockLead,
        isLoading: false,
        error: null,
      });

      // Act
      await act(async () => {
        render(<LeadDetailsPage params={Promise.resolve({ id: "test-lead-123" })} />);
      });

      // Assert: Should show N/A for missing fields
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      const emailElements = screen.getAllByText("N/A");
      expect(emailElements.length).toBeGreaterThan(0);
    });
  });

  describe("Slice 3: Appointment scheduling button", () => {
    it("should display 'Agendar Cita' button when lead is loaded", async () => {
      // Arrange: Mock successful lead data
      const mockLead = {
        id: "test-lead-123",
        buyer_name: "John Doe",
        buyer_email: "john@example.com",
        buyer_phone: "+1-555-0123",
        product_id: null,
        product: null,
        message: "I'm interested in this vehicle",
        status: "new" as const,
        source: "facebook",
        created_at: "2026-04-28T12:00:00Z",
        updated_at: "2026-04-28T12:00:00Z",
      };

      (useLead as vi.Mock).mockReturnValue({
        data: mockLead,
        isLoading: false,
        error: null,
      });

      // Act
      await act(async () => {
        render(<LeadDetailsPage params={Promise.resolve({ id: "test-lead-123" })} />);
      });

      // Assert: "Agendar Cita" button should be visible
      expect(screen.getByRole("button", { name: /Agendar Cita/i })).toBeInTheDocument();
    });

    it("should not display 'Agendar Cita' button when loading", async () => {
      // Arrange: Mock loading state
      (useLead as vi.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      // Act
      await act(async () => {
        render(<LeadDetailsPage params={Promise.resolve({ id: "test-lead-123" })} />);
      });

      // Assert: "Agendar Cita" button should not be visible
      expect(screen.queryByRole("button", { name: /Agendar Cita/i })).not.toBeInTheDocument();
    });

    it("should not display 'Agendar Cita' button when there's an error", async () => {
      // Arrange: Mock error state
      const mockError = new Error("Failed to fetch lead");
      (useLead as vi.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
      });

      // Act
      await act(async () => {
        render(<LeadDetailsPage params={Promise.resolve({ id: "test-lead-123" })} />);
      });

      // Assert: "Agendar Cita" button should not be visible
      expect(screen.queryByRole("button", { name: /Agendar Cita/i })).not.toBeInTheDocument();
    });
  });
});

// Import after mocks to avoid hoisting issues
import LeadDetailsPage from "./page";
