"""Update team use case."""

from uuid import UUID

from prosell.application.dto.team import TeamResponse, UpdateTeamRequest
from prosell.domain.exceptions.org_exceptions import TeamNotFoundException
from prosell.domain.repositories.team_repository import AbstractTeamRepository


class UpdateTeamUseCase:
    """Update team basic info."""

    def __init__(self, team_repository: AbstractTeamRepository) -> None:
        self.team_repository = team_repository

    async def execute(
        self,
        team_id: UUID,
        tenant_id: UUID,
        request: UpdateTeamRequest,
    ) -> TeamResponse:
        """
        Update team fields.

        Args:
            team_id: Team UUID
            tenant_id: Tenant UUID for isolation
            request: UpdateTeamRequest DTO

        Returns:
            Updated TeamResponse DTO

        Raises:
            TeamNotFoundException: If not found
        """
        team = await self.team_repository.get_by_id(team_id, tenant_id)
        if not team:
            raise TeamNotFoundException(str(team_id))

        # Apply only provided fields
        if request.name is not None:
            team.update_name(request.name)

        if request.description is not None:
            team.update_description(request.description)

        updated = await self.team_repository.update(team)
        return TeamResponse.from_entity(updated)
