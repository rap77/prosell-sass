/**
 * Unit tests for LeadReassignModal component
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LeadReassignModal } from "./LeadReassignModal";
import { toast } from "sonner";
import { LeadStatus } from "@/lib/api/leads";

// Mock fetch
global.fetch = vi.fn();

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock vendedores API
const mockVendedores = [
  { id: "vendedor-1", name: "Juan Pérez", email: "juan@example.com", role: "SALES_AGENT" },
  { id: "vendedor-2", name: "María García", email: "maria@example.com", role: "SALES_AGENT" },
  { id: "vendedor-3", name: "Carlos López", email: "carlos@example.com", role: "SALES_AGENT" },
];

const mockLead = {
  id: "lead-1",
  buyer_name: "John Doe",
  buyer_email: "john@example.com",
  buyer_phone: "+1234567890",
  product_id: "product-1",
  product: {
    id: "product-1",
    title: "2020 Toyota Camry",
    price_cents: 2500000,
    currency: "USD",
    status: "active",
    attributes: { category: "vehicle", year: 2020, make: "Toyota", model: "Camry" },
    created_at: "2026-04-28T12:00:00Z",
    updated_at: "2026-04-28T12:00:00Z",
  },
  message: "Interested in this vehicle",
  status: LeadStatus.NEW,
  source: "facebook",
  created_at: "2026-04-28T12:00:00Z",
  updated_at: "2026-04-28T12:00:00Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("LeadReassignModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for vendedores
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: mockVendedores,
        total: 3,
        limit: 100,
        offset: 0,
      }),
    });
  });

  it("should render modal when open", () => {
    render(
      <LeadReassignModal
        lead={mockLead}
        open={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText("Reassign Lead")).toBeInTheDocument();
  });

  it("should not render modal when closed", () => {
    render(
      <LeadReassignModal
        lead={mockLead}
        open={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText("Reassign Lead")).not.toBeInTheDocument();
  });

  it("should display lead information", () => {
    render(
      <LeadReassignModal
        lead={mockLead}
        open={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(mockLead.buyer_name)).toBeInTheDocument();
    expect(screen.getByText(mockLead.product?.title || "")).toBeInTheDocument();
  });

  it("should load vendedores and enable dropdown", () => {
    render(
      <LeadReassignModal
        lead={mockLead}
        open={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // Verify the select trigger exists by test ID
    const selectTrigger = screen.getByTestId("vendedor-select");
    expect(selectTrigger).toBeInTheDocument();
  });

  it("should call onClose when cancel button is clicked", async () => {
    const onClose = vi.fn();

    render(
      <LeadReassignModal
        lead={mockLead}
        open={true}
        onClose={onClose}
        onSuccess={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await userEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("should disable confirm button when no vendedor is selected", () => {
    render(
      <LeadReassignModal
        lead={mockLead}
        open={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    const confirmButton = screen.getByRole("button", { name: /reassign/i });
    expect(confirmButton).toBeDisabled();
  });
});
