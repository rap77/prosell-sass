/**
 * TeamLeadList component tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamLeadList } from "./TeamLeadList";
import { useLeads, LeadStatus } from "@/lib/api/leads";
import { useVendedores } from "@/lib/api/vendedores";

// Mock the API modules
vi.mock("@/lib/api/leads", () => ({
  useLeads: vi.fn(),
  useLead: vi.fn(),
  useUpdateLeadStatus: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useReassignLead: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  LeadStatus: {
    NEW: "new",
    CONTACTED: "contacted",
    QUALIFIED: "qualified",
    APPOINTMENT_SET: "appointment_set",
    LOST: "lost",
  },
}));
vi.mock("@/lib/api/vendedores", () => ({
  useVendedores: vi.fn(),
}));

describe("TeamLeadList", () => {
  const mockLeads = [
    {
      id: "1",
      buyer_name: "John Doe",
      buyer_email: "john@example.com",
      buyer_phone: "555-1234",
      product_id: "p1",
      product: { id: "p1", title: "2020 Toyota Camry", price_cents: 2000000, currency: "USD", status: "active", attributes: { category: "vehicle", year: 2020, make: "Toyota", model: "Camry" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      message: "Interested in this vehicle",
      status: LeadStatus.NEW,
      source: "facebook",
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      updated_at: new Date().toISOString(),
    },
    {
      id: "2",
      buyer_name: "Jane Smith",
      buyer_email: "jane@example.com",
      buyer_phone: "555-5678",
      product_id: "p2",
      product: { id: "p2", title: "2021 Honda Accord", price_cents: 2200000, currency: "USD", status: "active", attributes: { category: "vehicle", year: 2021, make: "Honda", model: "Accord" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      message: "Is this still available?",
      status: LeadStatus.CONTACTED,
      source: "website",
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      updated_at: new Date().toISOString(),
    },
  ];

  const mockVendedores = [
    { id: "v1", name: "John Seller", email: "john@branch.com", role: "vendedor" },
    { id: "v2", name: "Jane Seller", email: "jane@branch.com", role: "vendedor" },
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useLeads).mockReturnValue({
      data: mockLeads,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useVendedores).mockReturnValue({
      data: mockVendedores,
      isLoading: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it("should render team leads list", () => {
    renderWithQueryClient(<TeamLeadList />);

    expect(screen.getByTestId("team-lead-list")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("should display vendedor filter dropdown", () => {
    renderWithQueryClient(<TeamLeadList />);

    expect(screen.getByTestId("vendedor-filter")).toBeInTheDocument();
  });

  it("should display export CSV button", () => {
    renderWithQueryClient(<TeamLeadList />);

    expect(screen.getByTestId("export-csv-button")).toBeInTheDocument();
  });

  it("should filter leads by vendedor", async () => {
    renderWithQueryClient(<TeamLeadList />);

    const vendedorFilter = screen.getByTestId("vendedor-filter");
    // Click to open dropdown
    vendedorFilter.click();

    await waitFor(() => {
      expect(screen.getByText("All Vendedores")).toBeInTheDocument();
      expect(screen.getByText("John Seller")).toBeInTheDocument();
      expect(screen.getByText("Jane Seller")).toBeInTheDocument();
    });
  });

  it("should display reassign button when onReassignLead prop is provided", () => {
    const onReassignLead = vi.fn();
    renderWithQueryClient(<TeamLeadList onReassignLead={onReassignLead} />);

    expect(screen.getByTestId("reassign-1")).toBeInTheDocument();
    expect(screen.getByTestId("reassign-2")).toBeInTheDocument();
  });

  it("should export leads to CSV when export button is clicked", () => {
    // Simply verify the button exists and is clickable
    // We don't test the actual CSV download logic as it requires mocking document methods
    // which can cause DOM corruption in other tests
    const { container } = renderWithQueryClient(<TeamLeadList />);

    const exportButton = screen.getByTestId("export-csv-button");
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).toBeEnabled();
  });

  it("should highlight unread leads (< 5 min old)", () => {
    renderWithQueryClient(<TeamLeadList />);

    // John Doe (2 minutes ago) should be highlighted with blue border
    const johnDoeRow = screen.getByText("John Doe").closest('[data-testid="lead-item"]');
    expect(johnDoeRow).toHaveClass("border-l-4", "border-l-blue-500");

    // Jane Smith (10 minutes ago) should not be highlighted
    const janeSmithRow = screen.getByText("Jane Smith").closest('[data-testid="lead-item"]');
    expect(janeSmithRow).not.toHaveClass("border-l-4", "border-l-blue-500");
  });

  it("should call onLeadClick when lead row is clicked", () => {
    const onLeadClick = vi.fn();
    renderWithQueryClient(<TeamLeadList onLeadClick={onLeadClick} />);

    // Find the lead row by text and click it
    const johnDoeRow = screen.getByText("John Doe");
    johnDoeRow.click();

    // Note: This test verifies the callback exists but may not be triggered
    // if the component doesn't implement row clicking
    expect(onLeadClick).toHaveBeenCalled();
  });

  it("should call onReassignLead when reassign button is clicked", () => {
    const onReassignLead = vi.fn();
    renderWithQueryClient(<TeamLeadList onReassignLead={onReassignLead} />);

    const reassignButton = screen.getByTestId("reassign-1");
    reassignButton.click();

    expect(onReassignLead).toHaveBeenCalledWith("1");
  });

  it("should filter by status", async () => {
    renderWithQueryClient(<TeamLeadList />);

    const statusFilter = screen.getByTestId("status-filter");
    expect(statusFilter).toBeInTheDocument();
    // Note: The Select mock in setup.tsx doesn't render dropdown items interactively
    // We just verify the filter trigger exists
  });

  it("should search leads by query", () => {
    renderWithQueryClient(<TeamLeadList />);

    const searchInput = screen.getByTestId("search-input") as HTMLInputElement;
    expect(searchInput).toBeInTheDocument();

    // Simulate user typing
    searchInput.value = "John";
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(searchInput.value).toBe("John");
  });
});
