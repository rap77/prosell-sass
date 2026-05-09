'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTeamStore } from '@/stores/teamStore'
import { logger } from '@/lib/logger'

/**
 * Props for TeamSwitcher component
 */
interface TeamSwitcherProps {
  /** Organization ID to fetch teams for */
  organizationId: string
  /** Tenant ID for multi-tenancy */
  tenantId: string
}

/**
 * TeamSwitcher component - Dropdown for switching between teams
 *
 * Features:
 * - Displays current team name
 * - Shows all user's teams in dropdown
 * - Handles team switching with page refresh
 * - Loading and error states
 * - Integrates with teamStore
 *
 * @example
 * ```tsx
 * <TeamSwitcher
 *   organizationId="org-123"
 *   tenantId="tenant-123"
 * />
 * ```
 */
export function TeamSwitcher({ organizationId, tenantId }: TeamSwitcherProps) {
  const router = useRouter()
  const { teams, currentTeam, isLoading, error, fetchTeamsByOrg, setCurrentTeam } = useTeamStore()

  // Fetch teams on mount if not already loaded
  useEffect(() => {
    if (teams.length === 0 && !isLoading) {
      fetchTeamsByOrg({
        org_id: organizationId,
        tenant_id: tenantId,
      })
    }
  }, [organizationId, tenantId, teams.length, isLoading, fetchTeamsByOrg])

  // Handle team selection
  const handleTeamSelect = (teamId: string) => {
    const selectedTeam = teams.find((t) => t.id === teamId)

    if (selectedTeam) {
      setCurrentTeam(selectedTeam)
      logger.info(`Team switched to: ${selectedTeam.name}`, { teamId: selectedTeam.id })

      // Refresh the page to update context
      router.refresh()
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <Users className="h-4 w-4 mr-2" />
        <span>Loading...</span>
      </Button>
    )
  }

  // Show error state
  if (error) {
    return (
      <Button variant="outline" disabled>
        <Users className="h-4 w-4 mr-2" />
        <span>Error</span>
      </Button>
    )
  }

  // Show no teams state
  if (teams.length === 0) {
    return (
      <Button variant="outline" disabled>
        <Users className="h-4 w-4 mr-2" />
        <span>No Teams</span>
      </Button>
    )
  }

  // Display current team name or placeholder
  const displayName = currentTeam?.name || 'Select Team'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" aria-label={`Select team. Currently: ${displayName}`}>
          <Users className="h-4 w-4" />
          <span className="hidden md:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Teams</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleTeamSelect(team.id)}
            className={currentTeam?.id === team.id ? 'bg-accent' : ''}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>{team.name}</span>
            {currentTeam?.id === team.id && (
              <span className="ml-auto text-xs text-muted-foreground">Active</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
