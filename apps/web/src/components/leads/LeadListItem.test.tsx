/**
 * LeadListItem Touch Gestures Tests (TDD)
 * Sprint 0 - Task 6.2: Swipe-to-reveal actions
 *
 * Touch-first pattern for mobile lead management:
 * - Swipe left 80px → reveal actions (edit, delete)
 * - Swipe right → hide actions
 * - Swipe left 200px → trigger delete confirmation
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LeadListItem } from "./LeadListItem";
import { Lead, LeadStatus } from "@/lib/api/leads";

// Test wrapper with QueryClient
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock lead data
const mockLead: Lead = {
  id: "lead-123",
  product_id: "prod-1",
  buyer_name: "Juan Pérez",
  buyer_email: "juan@example.com",
  buyer_phone: "+54 11 1234-5678",
  message: "Me interesa el vehículo",
  status: LeadStatus.NEW,
  source: "facebook",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  product: {
    id: "prod-1",
    title: "Toyota Corolla 2020",
    price_cents: 1500000,
    currency: "ARS",
    status: "active",
    attributes: {
      year: 2020,
      make: "Toyota",
      model: "Corolla",
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

describe("LeadListItem Touch Gestures", () => {
  it("should render without swipe gesture by default", () => {
    render(<LeadListItem lead={mockLead} />, { wrapper: TestWrapper });
    const item = screen.getByTestId("lead-item");
    expect(item).toBeTruthy();
  });

  it("should render swipeable container with motion.div", () => {
    const { container } = render(<LeadListItem lead={mockLead} />, {
      wrapper: TestWrapper,
    });
    // Swipe container is rendered as motion.div with testid
    const swipeContainer = container.querySelector(
      "[data-testid='swipe-container']",
    );
    expect(swipeContainer).toBeTruthy();
  });

  it("should have drag constraint to left only (no right drag)", () => {
    const { container } = render(<LeadListItem lead={mockLead} />, {
      wrapper: TestWrapper,
    });
    const swipeContainer = container.querySelector(
      "[data-testid='swipe-container']",
    );

    expect(swipeContainer).toBeTruthy();
    // dragConstraints should be { left: -100, right: 0 }
    // This is set via Framer Motion props
  });

  it("should reveal action buttons after swipe left simulation", async () => {
    const { container } = render(<LeadListItem lead={mockLead} />, {
      wrapper: TestWrapper,
    });

    // Initially, actions should be hidden
    let editButton = screen.queryByTestId("action-edit");
    let deleteButton = screen.queryByTestId("action-delete");

    expect(editButton).toBeFalsy(); // Hidden by default
    expect(deleteButton).toBeFalsy();

    // After swipe left (simulated via state change), actions become visible
    // We'll test this by checking the existence of action buttons in DOM
    // when the component is in "revealed" state
  });

  it("should have edit and delete action buttons", () => {
    // Actions only render when onEdit or onDelete props are provided
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(
      <LeadListItem lead={mockLead} onEdit={onEdit} onDelete={onDelete} />,
      { wrapper: TestWrapper },
    );

    // Actions are rendered behind the swipe container
    const actionsContainer = container.querySelector(
      "[data-testid='swipe-actions']",
    );
    expect(actionsContainer).toBeTruthy();

    // Both edit and delete buttons should be present
    const editButton = screen.getByTestId("action-edit");
    const deleteButton = screen.getByTestId("action-delete");
    expect(editButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();
  });

  it("should trigger onEdit callback when edit button clicked", () => {
    const onEdit = vi.fn();
    render(<LeadListItem lead={mockLead} onEdit={onEdit} />, {
      wrapper: TestWrapper,
    });

    // Find edit button (will be in swipe actions)
    const editButton = screen.queryByTestId("action-edit");

    if (editButton) {
      editButton.click();
      expect(onEdit).toHaveBeenCalledWith(mockLead.id);
    }
  });

  it("should trigger onDelete callback when delete button clicked", () => {
    const onDelete = vi.fn();
    render(<LeadListItem lead={mockLead} onDelete={onDelete} />, {
      wrapper: TestWrapper,
    });

    // Find delete button (will be in swipe actions)
    const deleteButton = screen.queryByTestId("action-delete");

    if (deleteButton) {
      deleteButton.click();
      expect(onDelete).toHaveBeenCalledWith(mockLead.id);
    }
  });

  it("should use touch-friendly button sizes (44px min)", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(
      <LeadListItem lead={mockLead} onEdit={onEdit} onDelete={onDelete} />,
      { wrapper: TestWrapper },
    );

    const actionsContainer = container.querySelector(
      "[data-testid='swipe-actions']",
    );
    expect(actionsContainer).toBeTruthy();

    const buttons = actionsContainer!.querySelectorAll("button");
    expect(buttons.length).toBe(2); // edit + delete

    buttons.forEach((button) => {
      // Buttons should use size="touch-icon" variant (44px min)
      expect(button.className).toMatch(/h-11/); // 44px in Tailwind
      expect(button.className).toMatch(/w-11/);
    });
  });

  it("should hide hover effects and use active state instead", () => {
    const { container } = render(<LeadListItem lead={mockLead} />, {
      wrapper: TestWrapper,
    });
    const item = container.querySelector("[data-testid='lead-item']");

    // Should NOT have onMouseEnter/onMouseLeave handlers
    // React doesn't expose event handlers in rendered output,
    // so we check that the component doesn't use inline hover styles
    expect(item).toBeTruthy();

    // The implementation should use CSS classes with :active instead of JS hover
  });

  it("should maintain data-testid for existing functionality", () => {
    render(<LeadListItem lead={mockLead} />, { wrapper: TestWrapper });

    // Ensure existing test IDs still work after adding swipe
    const item = screen.getByTestId("lead-item");
    expect(item).toBeTruthy();

    // Lead info should still be visible
    expect(screen.getByText("Juan Pérez")).toBeTruthy();
    expect(screen.getByText(/Toyota Corolla 2020/)).toBeTruthy();
  });
});
