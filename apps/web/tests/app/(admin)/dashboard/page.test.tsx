/**
 * Dashboard Page — heading hierarchy (a11y)
 *
 * Guards the WCAG 1.3.1 / 2.4.6 outline: section headers must sit at level 2
 * under the single page <h1>. Jumping straight to <h3> breaks the document
 * outline for screen-reader users who navigate by heading level.
 *
 * @see https://www.w3.org/WAI/WCAG22/quickref/#headings-and-labels
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(admin)/dashboard/page";

// ============================================
// MOCKS
// ============================================

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "1",
      first_name: "Vendedor",
      last_name: "Test",
      role: "Seller",
    },
  }),
}));

// Preserve the real LeadStatus enum (used in pipeline math) while stubbing
// the data-fetching hooks so the page renders without a QueryClient.
vi.mock("@/lib/api/leads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/leads")>();
  return {
    ...actual,
    useLeads: () => ({ data: [], isLoading: false }),
    useTeamMetrics: () => ({ data: undefined, isLoading: false }),
  };
});

// ============================================
// TESTS
// ============================================

describe("DashboardPage heading hierarchy", () => {
  it("renders exactly one h1 page title", () => {
    render(<DashboardPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("exposes section headers at level 2 (no orphan h3 jump)", () => {
    render(<DashboardPage />);

    // Sections live directly under the h1 → they must be h2, not h3.
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});
