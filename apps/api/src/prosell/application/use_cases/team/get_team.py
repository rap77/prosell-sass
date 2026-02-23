"""Get team use cases."""

from uuid import UUID

from prosell.application.dto.team import TeamListResponse, TeamResponse
from prosell.domain.exceptions.org_exceptions import TeamNotFoundException
from prosell.domain.repositories.team_repository import AbstractTeamRepository


class GetTeamUseCase:
    """Get a single team by ID."""

    def __init__(self, team_repository: AbstractTeamRepository) -> None:
        self.team_repository = team_repository

    async def execute(self, team_id: UUID, tenant_id: UUID) -> TeamResponse:
        """
        Fetch team by ID.

        Args:
            team_id: Team UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            TeamResponse DTO

        Raises:
            TeamNotFoundException: If not found
        """
        team = await self.team_repository.get_by_id(team_id, tenant_id)
        if not team:
            raise TeamNotFoundException(str(team_id))
        return TeamResponse.from_entity(team)


class GetTeamsByOrganizationUseCase:
    """Get all teams for an organization."""

    def __init__(self, team_repository: AbstractTeamRepository) -> None:
        self.team_repository = team_repository

    async def execute(
        self,
        org_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> TeamListResponse:
        """
        Fetch teams by organization.

        Args:
            org_id: Organization UUID
            tenant_id: Tenant UUID for isolation
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            TeamListResponse DTO
        """
        teams = await self.team_repository.get_by_org(
            org_id=org_id,
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
        )
        total = await self.team_repository.count_by_org(org_id, tenant_id)

        return TeamListResponse(
            teams=[TeamResponse.from_entity(t) for t in teams],
            total=total,
            skip=skip,
            limit=limit,
        )
