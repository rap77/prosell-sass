"""Add team member use case."""

from uuid import UUID

from prosell.application.dto.team import TeamMemberResponse
from prosell.domain.entities.team import TeamMemberRole
from prosell.domain.exceptions.org_exceptions import TeamNotFoundException
from prosell.domain.repositories.team_repository import (
    AbstractTeamMemberRepository,
    AbstractTeamRepository,
)


class AddTeamMemberUseCase:
    """Add a member to a team."""

    def __init__(
        self,
        team_repository: AbstractTeamRepository,
        team_member_repository: AbstractTeamMemberRepository,
    ) -> None:
        self.team_repository = team_repository
        self.team_member_repository = team_member_repository

    async def execute(
        self,
        team_id: UUID,
        user_id: UUID,
        tenant_id: UUID,
        role: str = "vendor",
        commission_rate: float | None = None,
    ) -> TeamMemberResponse:
        """
        Execute add member to team.

        Args:
            team_id: Team UUID
            user_id: User UUID to add
            tenant_id: Tenant UUID for isolation
            role: Member role (manager or vendor)
            commission_rate: Commission rate for vendors

        Returns:
            TeamMemberResponse DTO

        Raises:
            TeamNotFoundException: If team not found
            ValueError: If commission_rate is invalid
        """
        # 1. Get team
        team = await self.team_repository.get_by_id(team_id, tenant_id)
        if not team:
            raise TeamNotFoundException(str(team_id))

        # 2. Parse role
        member_role = TeamMemberRole(role)

        # 3. Add member via entity method (handles validation)
        member = team.add_member(
            user_id=user_id,
            role=member_role,
            commission_rate=commission_rate,
        )

        # 4. Persist member
        member = await self.team_member_repository.create(member)

        # 5. Update team (updated_at changed)
        await self.team_repository.update(team)

        return TeamMemberResponse.from_entity(member)
