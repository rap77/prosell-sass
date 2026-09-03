/**
 * TeamSwitcher.test.tsx
 *
 * TDD Tests for TeamSwitcher component
 *
 * Test suite following the Arrange-Act-Assert pattern:
 * 1. Component renders without errors
 * 2. Displays current team name
 * 3. Shows dropdown with all teams
 * 4. Handles team selection
 * 5. Shows loading state
 * 6. Shows error state
 * 7. Fetches teams for the organization via React Query
 */

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { TeamSwitcher } from "./TeamSwitcher";
import { teamApi, ApiError, type TeamListResponse } from "@/lib/api/teamApi";

// Mock teamStore — only currentTeam/setCurrentTeam remain, fetching moved to
// useTeamsByOrg (React Query).
const { mockUseTeamStore } = vi.hoisted(() => ({
  mockUseTeamStore: vi.fn(),
}));

vi.mock("@/stores/teamStore", () => ({
  useTeamStore: mockUseTeamStore,
}));

// Mock useRouter
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    refresh: mockRefresh,
  })),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithClient(organizationId = "org-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TeamSwitcher organizationId={organizationId} />
    </QueryClientProvider>,
  );
}

describe("TeamSwitcher", () => {
  const mockTeams = [
    {
      id: "team-1",
      name: "Sales Team A",
      tenant_id: "tenant-1",
      org_id: "org-1",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "team-2",
      name: "Sales Team B",
      tenant_id: "tenant-1",
      org_id: "org-1",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockCurrentTeam = mockTeams[0];

  const mockListResponse = (teams: typeof mockTeams): TeamListResponse => ({
    teams,
    total: teams.length,
    skip: 0,
    limit: 50,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockClear();
  });

  describe("Rendering", () => {
    it("renders the team switcher button", async () => {
      vi.spyOn(teamApi, "listByOrg").mockResolvedValue(
        mockListResponse(mockTeams),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: mockCurrentTeam,
        setCurrentTeam: vi.fn(),
      });

      renderWithClient();

      const button = await screen.findByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("displays current team name when available", async () => {
      vi.spyOn(teamApi, "listByOrg").mockResolvedValue(
        mockListResponse(mockTeams),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: mockCurrentTeam,
        setCurrentTeam: vi.fn(),
      });

      renderWithClient();

      await waitFor(() =>
        expect(screen.getAllByText("Sales Team A").length).toBeGreaterThan(0),
      );
    });

    it("displays placeholder when no current team is selected", async () => {
      vi.spyOn(teamApi, "listByOrg").mockResolvedValue(
        mockListResponse(mockTeams),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: null,
        setCurrentTeam: vi.fn(),
      });

      renderWithClient();

      await waitFor(() =>
        expect(screen.getByText("Select Team")).toBeInTheDocument(),
      );
    });

    it("shows loading state while teams are being fetched", async () => {
      let resolveFetch: (value: TeamListResponse) => void = () => {};
      vi.spyOn(teamApi, "listByOrg").mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: null,
        setCurrentTeam: vi.fn(),
      });

      renderWithClient();

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      resolveFetch(mockListResponse([]));
    });

    it("shows error state when teams fetch fails", async () => {
      vi.spyOn(teamApi, "listByOrg").mockRejectedValue(
        new ApiError("Failed to load teams"),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: null,
        setCurrentTeam: vi.fn(),
      });

      renderWithClient();

      await waitFor(() =>
        expect(screen.getByText(/error/i)).toBeInTheDocument(),
      );
    });
  });

  describe("Team Dropdown", () => {
    it("opens dropdown when button is clicked", async () => {
      const user = userEvent.setup();
      vi.spyOn(teamApi, "listByOrg").mockResolvedValue(
        mockListResponse(mockTeams),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: mockCurrentTeam,
        setCurrentTeam: vi.fn(),
      });

      renderWithClient();

      const button = await screen.findByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getAllByText("Sales Team A").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Sales Team B").length).toBeGreaterThan(0);
      });
    });

    it("displays all available teams in dropdown", async () => {
      const user = userEvent.setup();
      vi.spyOn(teamApi, "listByOrg").mockResolvedValue(
        mockListResponse(mockTeams),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: mockCurrentTeam,
        setCurrentTeam: vi.fn(),
      });

      renderWithClient();

      const button = await screen.findByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getAllByText("Sales Team A").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Sales Team B").length).toBeGreaterThan(0);
      });
    });
  });

  describe("Team Selection", () => {
    it("calls setCurrentTeam when a team is selected", async () => {
      const user = userEvent.setup();
      const mockSetCurrentTeam = vi.fn();
      vi.spyOn(teamApi, "listByOrg").mockResolvedValue(
        mockListResponse(mockTeams),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: mockTeams[0],
        setCurrentTeam: mockSetCurrentTeam,
      });

      renderWithClient();

      const button = await screen.findByRole("button");
      await user.click(button);

      const teamOption = await screen.findByText("Sales Team B");
      await user.click(teamOption);

      expect(mockSetCurrentTeam).toHaveBeenCalledWith(mockTeams[1]);
    });

    it("refreshes the router after team selection", async () => {
      const user = userEvent.setup();
      vi.spyOn(teamApi, "listByOrg").mockResolvedValue(
        mockListResponse(mockTeams),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: mockTeams[0],
        setCurrentTeam: vi.fn(),
      });

      renderWithClient();

      const button = await screen.findByRole("button");
      await user.click(button);

      const teamOption = await screen.findByText("Sales Team B");
      await user.click(teamOption);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("Fetching", () => {
    it("fetches teams for the given organization", async () => {
      vi.spyOn(teamApi, "listByOrg").mockResolvedValue(
        mockListResponse(mockTeams),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: null,
        setCurrentTeam: vi.fn(),
      });

      renderWithClient("org-1");

      await waitFor(() =>
        expect(teamApi.listByOrg).toHaveBeenCalledWith("org-1"),
      );
    });
  });

  describe("Accessibility", () => {
    it("has proper button label for screen readers", async () => {
      vi.spyOn(teamApi, "listByOrg").mockResolvedValue(
        mockListResponse(mockTeams),
      );
      mockUseTeamStore.mockReturnValue({
        currentTeam: mockCurrentTeam,
        setCurrentTeam: vi.fn(),
      });

      renderWithClient();

      const button = await screen.findByRole("button", {
        name: /select team/i,
      });
      expect(button).toHaveAttribute("aria-label");
    });
  });
});
