import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DashboardPage from "./page";

// Mock dependencies
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { name: "Test User", role: "admin" } })),
}));

vi.mock("@/lib/api/leads", () => ({
  useLeads: vi.fn(() => ({
    data: {
      leads: [],
      total: 0,
      page: 1,
      page_size: 10,
      total_pages: 1,
    },
    isLoading: false,
  })),
  useTeamMetrics: vi.fn(() => ({
    data: {
      total_leads: 42,
      new_today: 5,
      active_leads: 32,
      vendedor_breakdown: [],
      pipeline: {
        new: 10,
        contacted: 8,
        qualified: 6,
        proposal: 4,
        negotiation: 3,
        won: 2,
        lost: 1,
      },
    },
    isLoading: false,
  })),
  LeadStatus: {
    NEW: "new",
    CONTACTED: "contacted",
    QUALIFIED: "qualified",
    PROPOSAL: "proposal",
    NEGOTIATION: "negotiation",
    WON: "won",
    LOST: "lost",
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("DashboardPage - Mobile-First", () => {
  it("top bar should wrap on mobile: flex-wrap or flex-col md:flex-row", () => {
    const { container } = render(<DashboardPage />);

    const topBar = container.querySelector(
      ".flex.items-center.justify-between.gap-6",
    );
    expect(topBar).toBeTruthy();
    expect(
      topBar?.className.includes("flex-wrap") ||
        topBar?.className.includes("flex-col"),
    ).toBe(true);
  });

  it("KPI grid should have adequate mobile spacing: gap-4 or better", () => {
    const { container } = render(<DashboardPage />);

    const kpiGrid = container.querySelector(
      ".grid.grid-cols-2.lg\\:grid-cols-4",
    );
    expect(kpiGrid).toBeTruthy();
    expect(
      kpiGrid?.className.includes("gap-4") ||
        kpiGrid?.className.includes("gap-5") ||
        kpiGrid?.className.includes("gap-6"),
    ).toBe(true);
  });

  it("two-column grid should be responsive: grid-cols-1 lg:grid-cols-[...]", () => {
    const { container } = render(<DashboardPage />);

    // Main two-column section (leads + right sidebar)
    const twoColGrid = container.querySelectorAll(".grid")[1]; // Second grid after KPIs
    expect(twoColGrid).toBeTruthy();
    expect(twoColGrid?.className).toContain("grid-cols-1");
    expect(twoColGrid?.className).toContain("lg:grid-cols-");
  });

  it("pipeline bars should be mobile-friendly: small labels + responsive cols", () => {
    const { container } = render(<DashboardPage />);

    // Pipeline bar row
    const pipelineBar = container.querySelector(".grid.gap-3.items-center");
    expect(pipelineBar).toBeTruthy();
    // Should have 3 columns with at least one responsive
    expect(pipelineBar?.className).toContain("grid-cols-");
  });
});
