import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AnalyticsPage from "./page";

// Mock dependencies
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { name: "Test User", role: "seller" } })),
}));

vi.mock("@/lib/api/leads", () => ({
  useLeads: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useTeamMetrics: vi.fn(() => ({
    data: {
      total_leads: 42,
      new_leads_last_24h: 5,
      active_leads: 32,
      conversion_rate: 0.35,
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
    APPOINTMENT_SET: "appointment_set",
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

describe("AnalyticsPage - Mobile-First", () => {
  it("header should wrap on mobile: flex-wrap or flex-col md:flex-row", () => {
    const { container } = render(<AnalyticsPage />);

    const header = container.querySelector(".flex.justify-between");
    expect(header).toBeTruthy();
    expect(header?.className.includes("flex-wrap")).toBe(true);
    expect(header?.className.includes("items-start")).toBe(true);
    expect(header?.className.includes("gap-4")).toBe(true);
  });

  it("KPI grid should be responsive: grid-cols-2 md:grid-cols-4", () => {
    const { container } = render(<AnalyticsPage />);

    // KPI grid (first grid in the page)
    const kpiGrid = container.querySelector(".grid.gap-4");
    expect(kpiGrid).toBeTruthy();
    expect(kpiGrid?.className).toContain("grid-cols-2");
    expect(kpiGrid?.className).toContain("md:grid-cols-4");
  });

  it("main grid (funnel + leaderboard) should be responsive: grid-cols-1 lg:grid-cols-2", () => {
    const { container } = render(<AnalyticsPage />);

    // Main grid (second grid, after KPIs)
    const grids = container.querySelectorAll(".grid");
    const mainGrid = grids[1]; // Second grid
    expect(mainGrid).toBeTruthy();
    expect(mainGrid?.className).toContain("grid-cols-1");
    expect(mainGrid?.className).toContain("lg:grid-cols-2");
  });
});
