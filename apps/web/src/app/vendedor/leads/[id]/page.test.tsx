/**
 * LeadDetails page tests
 */

import { render, screen } from "@testing-library/react";
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
    it("should render loading state when lead is being fetched", () => {
      // Arrange: Mock loading state
      (useLead as vi.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      // Act & Assert: Page should render without errors
      expect(() => {
        render(<LeadDetailsPage params={{ id: "test-lead-123" }} />);
      }).not.toThrow();
    });

    it("should display loading indicator", () => {
      // Arrange: Mock loading state
      (useLead as vi.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      // Act
      render(<LeadDetailsPage params={{ id: "test-lead-123" }} />);

      // Assert: Loading text should be visible
      expect(screen.getByText(/Loading lead details/i)).toBeInTheDocument();
    });

    it("should display error state when fetch fails", () => {
      // Arrange: Mock error state
      const mockError = new Error("Failed to fetch lead");
      (useLead as vi.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
      });

      // Act
      render(<LeadDetailsPage params={{ id: "test-lead-123" }} />);

      // Assert: Error message should be visible
      expect(screen.getByText(/Error loading lead/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch lead/i)).toBeInTheDocument();
    });

    it("should display not found state when lead is null", () => {
      // Arrange: Mock not found state
      (useLead as vi.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      // Act
      render(<LeadDetailsPage params={{ id: "test-lead-123" }} />);

      // Assert: Not found message should be visible
      expect(screen.getByText(/Lead not found/i)).toBeInTheDocument();
    });
  });

  describe("Slice 2: Lead details display", () => {
    it("should display lead information when data is loaded", () => {
      // Arrange: Mock successful lead data
      const mockLead = {
        id: "test-lead-123",
        buyer_name: "John Doe",
        buyer_email: "john@example.com",
        buyer_phone: "+1-555-0123",
        vehicle: null,
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
      render(<LeadDetailsPage params={{ id: "test-lead-123" }} />);

      // Assert: Lead details should be visible
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("+1-555-0123")).toBeInTheDocument();
      expect(screen.getByText("I'm interested in this vehicle")).toBeInTheDocument();
      expect(screen.getByText(/facebook/i)).toBeInTheDocument();
    });

    it("should handle missing email and phone", () => {
      // Arrange: Mock lead with missing optional fields
      const mockLead = {
        id: "test-lead-123",
        buyer_name: "Jane Smith",
        buyer_email: null,
        buyer_phone: null,
        vehicle: null,
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
      render(<LeadDetailsPage params={{ id: "test-lead-123" }} />);

      // Assert: Should show N/A for missing fields
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      const emailElements = screen.getAllByText("N/A");
      expect(emailElements.length).toBeGreaterThan(0);
    });
  });
});

// Import after mocks to avoid hoisting issues
import LeadDetailsPage from "./page";
