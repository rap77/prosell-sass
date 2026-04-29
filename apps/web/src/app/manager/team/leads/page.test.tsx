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
  useLead: () => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
  useLeads: () => ({
    data: { items: [], total: 0 },
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
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
};

// Mock child components
vi.mock("@/components/leads/TeamMetricsCard", () => ({
  TeamMetricsCard: () => <div data-testid="team-metrics">Team Metrics</div>,
}));

vi.mock("@/components/leads/TeamLeadList", () => ({
  TeamLeadList: ({ onLeadClick, onReassignLead }: any) => (
    <div data-testid="team-lead-list">
      <button onClick={() => onLeadClick?.("lead-1")}>View Lead</button>
      <button onClick={() => onReassignLead?.("lead-1")}>Reassign Lead</button>
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

    expect(screen.getByText("Team Leads")).toBeInTheDocument();
    expect(
      screen.getByText("View and manage all leads across your team")
    ).toBeInTheDocument();
  });

  it("should render TeamMetricsCard", () => {
    renderWithQueryClient(<ManagerTeamLeadsPage />);

    expect(screen.getByTestId("team-metrics")).toBeInTheDocument();
  });

  it("should render TeamLeadList", () => {
    renderWithQueryClient(<ManagerTeamLeadsPage />);

    expect(screen.getByTestId("team-lead-list")).toBeInTheDocument();
  });

  it("should not show reassign modal initially", () => {
    const { container } = renderWithQueryClient(<ManagerTeamLeadsPage />);

    // Modal should not be present initially
    expect(container.querySelector('[data-testid="reassign-modal"]')).not.toBeInTheDocument();
  });
});
