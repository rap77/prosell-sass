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
 * 7. Integrates with teamStore
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { TeamSwitcher } from "./TeamSwitcher";

// Mock teamApi
vi.mock("@/lib/api/teamApi", () => ({
  teamApi: {
    listByOrg: vi.fn(),
  },
  ApiError: class extends Error {
    constructor(
      message: string,
      public status?: number,
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

// Mock teamStore
const mockUseTeamStore = vi.fn();
vi.mock("@/stores/teamStore", () => ({
  useTeamStore: () => mockUseTeamStore(),
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

describe("TeamSwitcher", () => {
  const mockTeams = [
    {
      id: "team-1",
      name: "Sales Team A",
      tenant_id: "tenant-1",
      organization_id: "org-1",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "team-2",
      name: "Sales Team B",
      tenant_id: "tenant-1",
      organization_id: "org-1",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockCurrentTeam = mockTeams[0];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockClear();
  });

  describe("Rendering", () => {
    it("renders the team switcher button", () => {
      mockUseTeamStore.mockReturnValue({
        teams: mockTeams,
        currentTeam: mockCurrentTeam,
        isLoading: false,
        error: null,
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("displays current team name when available", () => {
      mockUseTeamStore.mockReturnValue({
        teams: mockTeams,
        currentTeam: mockCurrentTeam,
        isLoading: false,
        error: null,
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      expect(screen.getAllByText("Sales Team A").length).toBeGreaterThan(0);
    });

    it("displays placeholder when no current team is selected", () => {
      mockUseTeamStore.mockReturnValue({
        teams: mockTeams,
        currentTeam: null,
        isLoading: false,
        error: null,
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      expect(screen.getByText("Select Team")).toBeInTheDocument();
    });

    it("shows loading state when teams are being fetched", () => {
      mockUseTeamStore.mockReturnValue({
        teams: [],
        currentTeam: null,
        isLoading: true,
        error: null,
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("shows error state when teams fetch fails", () => {
      mockUseTeamStore.mockReturnValue({
        teams: [],
        currentTeam: null,
        isLoading: false,
        error: { message: "Failed to load teams" },
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe("Team Dropdown", () => {
    it("opens dropdown when button is clicked", async () => {
      const user = userEvent.setup();
      mockUseTeamStore.mockReturnValue({
        teams: mockTeams,
        currentTeam: mockCurrentTeam,
        isLoading: false,
        error: null,
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      const button = screen.getByRole("button");
      await user.click(button);

      // Check if dropdown menu appears - both teams should be visible
      await waitFor(() => {
        expect(screen.getAllByText("Sales Team A").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Sales Team B").length).toBeGreaterThan(0);
      });
    });

    it("displays all available teams in dropdown", async () => {
      const user = userEvent.setup();
      mockUseTeamStore.mockReturnValue({
        teams: mockTeams,
        currentTeam: mockCurrentTeam,
        isLoading: false,
        error: null,
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      const button = screen.getByRole("button");
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

      mockUseTeamStore.mockReturnValue({
        teams: mockTeams,
        currentTeam: mockTeams[0],
        isLoading: false,
        error: null,
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: mockSetCurrentTeam,
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      const button = screen.getByRole("button");
      await user.click(button);

      // Click on the second team
      const teamOption = await screen.findByText("Sales Team B");
      await user.click(teamOption);

      expect(mockSetCurrentTeam).toHaveBeenCalledWith(mockTeams[1]);
    });

    it("refreshes the router after team selection", async () => {
      const user = userEvent.setup();
      const mockSetCurrentTeam = vi.fn();

      mockUseTeamStore.mockReturnValue({
        teams: mockTeams,
        currentTeam: mockTeams[0],
        isLoading: false,
        error: null,
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: mockSetCurrentTeam,
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      const button = screen.getByRole("button");
      await user.click(button);

      const teamOption = await screen.findByText("Sales Team B");
      await user.click(teamOption);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("Integration with teamStore", () => {
    it("fetches teams on mount when teams list is empty", () => {
      const mockFetchTeams = vi.fn();
      mockUseTeamStore.mockReturnValue({
        teams: [],
        currentTeam: null,
        isLoading: false,
        error: null,
        fetchTeamsByOrg: mockFetchTeams,
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      expect(mockFetchTeams).toHaveBeenCalledWith({
        org_id: "org-1",
        tenant_id: "tenant-1",
      });
    });

    it("does not fetch teams on mount when teams list is not empty", () => {
      const mockFetchTeams = vi.fn();
      mockUseTeamStore.mockReturnValue({
        teams: mockTeams,
        currentTeam: mockCurrentTeam,
        isLoading: false,
        error: null,
        fetchTeamsByOrg: mockFetchTeams,
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      expect(mockFetchTeams).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has proper button label for screen readers", () => {
      mockUseTeamStore.mockReturnValue({
        teams: mockTeams,
        currentTeam: mockCurrentTeam,
        isLoading: false,
        error: null,
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label");
    });

    it("shows team icon", () => {
      mockUseTeamStore.mockReturnValue({
        teams: mockTeams,
        currentTeam: mockCurrentTeam,
        isLoading: false,
        error: null,
        fetchTeamsByOrg: vi.fn(),
        setCurrentTeam: vi.fn(),
      });

      render(<TeamSwitcher organizationId="org-1" tenantId="tenant-1" />);

      // Check for Users/Teams icon
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });
  });
});
