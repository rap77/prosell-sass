/**
 * TeamLeadList component tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamLeadList } from "./TeamLeadList";
import { useLeads } from "@/lib/api/leads";
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
vi.mock("@/lib/api/vendedores");

describe("TeamLeadList", () => {
  let queryClient: QueryClient;

  const mockLeads = [
    {
      id: "1",
      buyer_name: "John Doe",
      buyer_email: "john@example.com",
      buyer_phone: "555-1234",
      vehicle: { id: "v1", title: "2020 Toyota Camry", make: "Toyota", model: "Camry", year: 2020 },
      message: "Interested in this vehicle",
      status: "new" as const,
      source: "facebook",
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      updated_at: new Date().toISOString(),
    },
    {
      id: "2",
      buyer_name: "Jane Smith",
      buyer_email: "jane@example.com",
      buyer_phone: "555-5678",
      vehicle: { id: "v2", title: "2021 Honda Accord", make: "Honda", model: "Accord", year: 2021 },
      message: "Is this still available?",
      status: "contacted" as const,
      source: "website",
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      updated_at: new Date().toISOString(),
    },
  ];

  const mockVendedores = [
    { id: "v1", name: "John Seller", email: "john@dealer.com", role: "vendedor" },
    { id: "v2", name: "Jane Seller", email: "jane@dealer.com", role: "vendedor" },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

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

  const renderWithQueryClient = (component: React.ReactElement) => {
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
    // Mock document methods for CSV download
    const mockLink = { href: "", download: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);
    vi.spyOn(document.body, "appendChild").mockImplementation(() => {});
    vi.spyOn(document.body, "removeChild").mockImplementation(() => {});

    renderWithQueryClient(<TeamLeadList />);

    const exportButton = screen.getByTestId("export-csv-button");
    exportButton.click();

    expect(mockLink.click).toHaveBeenCalled();
  });

  it("should highlight unread leads (< 5 min old)", () => {
    renderWithQueryClient(<TeamLeadList />);

    // John Doe (2 minutes ago) should be highlighted with blue border
    const johnDoeRow = screen.getByText("John Doe").closest(".flex.items-center");
    expect(johnDoeRow).toHaveClass("border-l-4", "border-l-blue-500");

    // Jane Smith (10 minutes ago) should not be highlighted
    const janeSmithRow = screen.getByText("Jane Smith").closest(".flex.items-center");
    expect(janeSmithRow).not.toHaveClass("border-l-4", "border-l-blue-500");
  });

  it("should call onLeadClick when lead row is clicked", () => {
    const onLeadClick = vi.fn();
    renderWithQueryClient(<TeamLeadList onLeadClick={onLeadClick} />);

    const johnDoeRow = screen.getByText("John Doe").closest(".flex.items.cursor-pointer");
    johnDoeRow?.click();

    expect(onLeadClick).toHaveBeenCalledWith("1");
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
    statusFilter.click();

    await waitFor(() => {
      expect(screen.getByText("All Statuses")).toBeInTheDocument();
      expect(screen.getByText("New")).toBeInTheDocument();
      expect(screen.getByText("Contacted")).toBeInTheDocument();
    });
  });

  it("should search leads by query", () => {
    renderWithQueryClient(<TeamLeadList />);

    const searchInput = screen.getByTestId("search-input");
    searchInput.click();
    searchInput.type = "John";

    expect(searchInput).toHaveValue("John");
  });
});
