/**
 * useTeams - Convenience hook for team management
 *
 * Provides a simplified interface to the teamStore for team operations.
 * This is a thin wrapper around useTeamStore that provides commonly used
 * team management functionality.
 *
 * @example
 * ```tsx
 * const { teams, currentTeam, switchTeam, isLoading } = useTeams()
 *
 * if (isLoading) return <Spinner />
 * return <TeamSwitcher teams={teams} currentTeam={currentTeam} />
 * ```
 *
 * @see {@link useTeamStore} for the underlying store implementation
 */
import { useTeamStore } from "@/stores/teamStore";
import { useShallow } from "zustand/react/shallow";
import type {
  Team,
  CreateTeamRequest,
  UpdateTeamRequest,
  AddTeamMemberRequest,
} from "@/lib/api/teamApi";
import type { TeamError } from "@/stores/teamStore";

/**
 * Parameters accepted by {@link UseTeamsReturn.fetchTeams}
 */
export interface FetchTeamsParams {
  skip?: number;
  limit?: number;
}

/**
 * Return type for the useTeams hook
 *
 * Provides team state and actions for common team operations.
 */
export interface UseTeamsReturn {
  /** List of teams available to the user */
  teams: Team[];

  /** Currently selected team */
  currentTeam: Team | null;

  /** Whether team operations are in progress */
  isLoading: boolean;

  /** Current error state, if any */
  error: TeamError | null;

  /** Switch to a different team */
  switchTeam: (team: Team) => void;

  /** Fetch teams for an organization */
  fetchTeams: (orgId: string, params?: FetchTeamsParams) => Promise<void>;

  /** Create a new team */
  createTeam: (data: CreateTeamRequest) => Promise<Team>;

  /** Update team information */
  updateTeam: (teamId: string, data: UpdateTeamRequest) => Promise<void>;

  /** Add a member to a team */
  addMember: (
    teamId: string,
    data: Omit<AddTeamMemberRequest, "team_id">,
  ) => Promise<void>;

  /** Clear the current error */
  clearError: () => void;
}

/**
 * useTeams hook implementation
 *
 * Wraps the teamStore with a more convenient API for team management.
 * Provides team state and actions for common operations.
 *
 * @returns {UseTeamsReturn} Team state and actions
 */
export function useTeams(): UseTeamsReturn {
  const {
    teams,
    currentTeam,
    isLoading,
    error,
    fetchTeamsByOrg,
    setCurrentTeam,
    createTeam,
    updateTeam,
    addMember,
    clearError,
  } = useTeamStore(
    useShallow((state) => ({
      teams: state.teams,
      currentTeam: state.currentTeam,
      isLoading: state.isLoading,
      error: state.error,
      fetchTeamsByOrg: state.fetchTeamsByOrg,
      setCurrentTeam: state.setCurrentTeam,
      createTeam: state.createTeam,
      updateTeam: state.updateTeam,
      addMember: state.addMember,
      clearError: state.clearError,
    })),
  );

  // Switch to a different team
  const switchTeam = (team: Team) => {
    setCurrentTeam(team);
  };

  // Fetch teams for an organization
  const fetchTeams = async (orgId: string, params?: FetchTeamsParams) => {
    await fetchTeamsByOrg({
      org_id: orgId,
      skip: params?.skip,
      limit: params?.limit,
    });
  };

  return {
    teams,
    currentTeam,
    isLoading,
    error,
    switchTeam,
    fetchTeams,
    createTeam,
    updateTeam,
    addMember,
    clearError,
  };
}
