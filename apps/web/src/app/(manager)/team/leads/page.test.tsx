import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ManagerTeamLeadsPage from "./page";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

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
  LeadReassignModal: ({ leadId, onClose }: any) => (
    <div data-testid="reassign-modal">Reassign modal for {leadId}</div>
  ),
}));

describe("ManagerTeamLeadsPage", () => {
  it("should render page header", () => {
    render(<ManagerTeamLeadsPage />);

    expect(screen.getByText("Team Leads")).toBeInTheDocument();
    expect(
      screen.getByText("View and manage all leads across your team")
    ).toBeInTheDocument();
  });

  it("should render TeamMetricsCard", () => {
    render(<ManagerTeamLeadsPage />);

    expect(screen.getByTestId("team-metrics")).toBeInTheDocument();
  });

  it("should render TeamLeadList", () => {
    render(<ManagerTeamLeadsPage />);

    expect(screen.getByTestId("team-lead-list")).toBeInTheDocument();
  });

  it("should not show reassign modal initially", () => {
    const { container } = render(<ManagerTeamLeadsPage />);

    // Modal should not be present initially
    expect(container.querySelector('[data-testid="reassign-modal"]')).not.toBeInTheDocument();
  });
});
