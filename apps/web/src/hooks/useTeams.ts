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
import { useTeamStore } from "@/stores/teamStore"
import type { Team } from "@/lib/api/teamApi"
import type { TeamError } from "@/stores/teamStore"

/**
 * Return type for the useTeams hook
 *
 * Provides team state and actions for common team operations.
 */
export interface UseTeamsReturn {
  /** List of teams available to the user */
  teams: Team[]

  /** Currently selected team */
  currentTeam: Team | null

  /** Whether team operations are in progress */
  isLoading: boolean

  /** Current error state, if any */
  error: TeamError | null

  /** Switch to a different team */
  switchTeam: (team: Team) => void

  /** Fetch teams for an organization */
  fetchTeams: (orgId: string, tenantId: string, params?: { skip?: number; limit?: number }) => Promise<void>

  /** Create a new team */
  createTeam: (data: { name: string; tenant_id: string; organization_id: string }) => Promise<Team>

  /** Update team information */
  updateTeam: (teamId: string, data: { name?: string }) => Promise<void>

  /** Add a member to a team */
  addMember: (teamId: string, data: Omit<{
    team_id: string
    user_id: string
    tenant_id: string
    role?: "manager" | "vendor"
    commission_rate?: number | null
  }, "team_id">) => Promise<void>

  /** Clear the current error */
  clearError: () => void
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
  } = useTeamStore()

  // Switch to a different team
  const switchTeam = (team: Team) => {
    setCurrentTeam(team)
  }

  // Fetch teams for an organization
  const fetchTeams = async (
    orgId: string,
    tenantId: string,
    params?: { skip?: number; limit?: number },
  ) => {
    await fetchTeamsByOrg({
      org_id: orgId,
      tenant_id: tenantId,
      skip: params?.skip,
      limit: params?.limit,
    })
  }

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
  }
}
