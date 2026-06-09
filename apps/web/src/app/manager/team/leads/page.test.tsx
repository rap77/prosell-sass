import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ManagerTeamLeadsPage from "./page";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useLead hook
vi.mock("@/lib/api/leads", () => ({
  LeadStatus: {
    NEW: "new",
    CONTACTED: "contacted",
    QUALIFIED: "qualified",
    APPOINTMENT_SET: "appointment_set",
    LOST: "lost",
  },
  useLead: () => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
  useLeads: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
  );
};

// Mock child components
vi.mock("@/components/leads/LeadList", () => ({
  LeadList: ({ onLeadClick }: any) => (
    <div data-testid="lead-list">
      <button onClick={() => onLeadClick?.("lead-1")}>View Lead</button>
    </div>
  ),
}));

vi.mock("@/components/leads/LeadReassignModal", () => ({
  LeadReassignModal: ({ leadId, onClose }: any) => {
    // Only render modal if leadId is provided (not null/undefined)
    if (!leadId) return null;
    return <div data-testid="reassign-modal">Reassign modal for {leadId}</div>;
  },
}));

describe("ManagerTeamLeadsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render page header", () => {
    renderWithQueryClient(<ManagerTeamLeadsPage />);

    expect(screen.getByText("Leads del equipo")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Supervisión de todos los leads activos asignados al equipo.",
      ),
    ).toBeInTheDocument();
  });

  it("should render LeadList", () => {
    renderWithQueryClient(<ManagerTeamLeadsPage />);

    expect(screen.getByTestId("lead-list")).toBeInTheDocument();
  });

  it("should render team description", () => {
    renderWithQueryClient(<ManagerTeamLeadsPage />);

    expect(
      screen.getByText(
        "Supervisión de todos los leads activos asignados al equipo.",
      ),
    ).toBeInTheDocument();
  });

  it("should not show reassign modal initially", () => {
    const { container } = renderWithQueryClient(<ManagerTeamLeadsPage />);

    // Modal should not be present initially
    expect(
      container.querySelector('[data-testid="reassign-modal"]'),
    ).not.toBeInTheDocument();
  });
});
