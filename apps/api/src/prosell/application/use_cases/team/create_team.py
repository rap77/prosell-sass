"""Create team use case."""

from uuid import UUID

from prosell.application.dto.team import CreateTeamRequest, TeamResponse
from prosell.domain.entities.team import Team
from prosell.domain.exceptions.org_exceptions import TeamAlreadyExistsException
from prosell.domain.repositories.team_repository import AbstractTeamRepository


class CreateTeamUseCase:
    """Create a new team."""

    def __init__(self, team_repository: AbstractTeamRepository) -> None:
        self.team_repository = team_repository

    async def execute(self, request: CreateTeamRequest, tenant_id: UUID) -> TeamResponse:
        """
        Execute team creation.

        Args:
            request: CreateTeamRequest DTO
            tenant_id: Authenticated user's tenant_id (never client-supplied)

        Returns:
            TeamResponse DTO

        Raises:
            TeamAlreadyExistsException: If name already exists for org
        """
        # 1. Check uniqueness within org
        exists = await self.team_repository.exists_by_name(
            request.name,
            request.org_id,
            tenant_id,
        )
        if exists:
            raise TeamAlreadyExistsException(request.name)

        # 2. Create team entity
        team = Team.create(
            name=request.name,
            tenant_id=tenant_id,
            org_id=request.org_id,
            parent_team_id=request.parent_team_id,
        )

        # Apply optional fields
        if request.description is not None:
            team.description = request.description

        # 3. Persist team
        team = await self.team_repository.create(team)

        return TeamResponse.from_entity(team)
