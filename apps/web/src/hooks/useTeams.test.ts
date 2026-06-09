/**
 * useTeams.test.ts
 *
 * Tests for the useTeams hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTeams } from "./useTeams";

// Mock teamStore
const mockFetchTeamsByOrg = vi.fn();
const mockSetCurrentTeam = vi.fn();
const mockCreateTeam = vi.fn();
const mockUpdateTeam = vi.fn();
const mockAddMember = vi.fn();
const mockClearError = vi.fn();

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

vi.mock("@/stores/teamStore", () => ({
  useTeamStore: () => ({
    teams: mockTeams,
    currentTeam: mockTeams[0],
    isLoading: false,
    error: null,
    fetchTeamsByOrg: mockFetchTeamsByOrg,
    setCurrentTeam: mockSetCurrentTeam,
    createTeam: mockCreateTeam,
    updateTeam: mockUpdateTeam,
    addMember: mockAddMember,
    clearError: mockClearError,
  }),
}));

describe("useTeams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns teams from the store", () => {
    const { result } = renderHook(() => useTeams());

    expect(result.current.teams).toEqual(mockTeams);
    expect(result.current.teams.length).toBe(2);
  });

  it("returns current team from the store", () => {
    const { result } = renderHook(() => useTeams());

    expect(result.current.currentTeam).toEqual(mockTeams[0]);
    expect(result.current.currentTeam?.name).toBe("Sales Team A");
  });

  it("returns loading state from the store", () => {
    const { result } = renderHook(() => useTeams());

    expect(result.current.isLoading).toBe(false);
  });

  it("returns error state from the store", () => {
    const { result } = renderHook(() => useTeams());

    expect(result.current.error).toBeNull();
  });

  it("switches team when calling switchTeam", () => {
    const { result } = renderHook(() => useTeams());

    act(() => {
      result.current.switchTeam(mockTeams[1]);
    });

    expect(mockSetCurrentTeam).toHaveBeenCalledWith(mockTeams[1]);
  });

  it("fetches teams when calling fetchTeams", async () => {
    const { result } = renderHook(() => useTeams());

    await act(async () => {
      await result.current.fetchTeams("org-1", "tenant-1", {
        skip: 0,
        limit: 10,
      });
    });

    expect(mockFetchTeamsByOrg).toHaveBeenCalledWith({
      org_id: "org-1",
      tenant_id: "tenant-1",
      skip: 0,
      limit: 10,
    });
  });

  it("creates team when calling createTeam", async () => {
    const { result } = renderHook(() => useTeams());

    const newTeamData = {
      name: "New Team",
      tenant_id: "tenant-1",
      organization_id: "org-1",
    };

    await act(async () => {
      await result.current.createTeam(newTeamData);
    });

    expect(mockCreateTeam).toHaveBeenCalledWith(newTeamData);
  });

  it("updates team when calling updateTeam", async () => {
    const { result } = renderHook(() => useTeams());

    await act(async () => {
      await result.current.updateTeam("team-1", { name: "Updated Team" });
    });

    expect(mockUpdateTeam).toHaveBeenCalledWith("team-1", {
      name: "Updated Team",
    });
  });

  it("adds member when calling addMember", async () => {
    const { result } = renderHook(() => useTeams());

    const memberData = {
      user_id: "user-1",
      tenant_id: "tenant-1",
      role: "vendor" as const,
    };

    await act(async () => {
      await result.current.addMember("team-1", memberData);
    });

    expect(mockAddMember).toHaveBeenCalledWith("team-1", memberData);
  });

  it("clears error when calling clearError", () => {
    const { result } = renderHook(() => useTeams());

    act(() => {
      result.current.clearError();
    });

    expect(mockClearError).toHaveBeenCalled();
  });
});
