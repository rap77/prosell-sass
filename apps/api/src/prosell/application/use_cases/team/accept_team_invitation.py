"""Accept team invitation use case."""

from uuid import UUID

from prosell.application.dto.team import TeamMemberResponse
from prosell.domain.entities.team import TeamMemberRole
from prosell.domain.exceptions.org_exceptions import TeamNotFoundException
from prosell.domain.repositories.team_invitation_repository import (
    AbstractTeamInvitationRepository,
)
from prosell.domain.repositories.team_repository import (
    AbstractTeamMemberRepository,
    AbstractTeamRepository,
)


class AcceptTeamInvitationUseCase:
    """Accept a team invitation and add user to team."""

    def __init__(
        self,
        team_repository: AbstractTeamRepository,
        team_member_repository: AbstractTeamMemberRepository,
        invitation_repository: AbstractTeamInvitationRepository,
    ) -> None:
        self.team_repository = team_repository
        self.team_member_repository = team_member_repository
        self.invitation_repository = invitation_repository

    async def execute(
        self,
        token: str,
        user_id: UUID,
        tenant_id: UUID,
    ) -> TeamMemberResponse:
        """
        Execute accept team invitation use case.

        Args:
            token: Invitation token (SHA256 hash)
            user_id: User UUID accepting the invitation
            tenant_id: Tenant UUID for isolation

        Returns:
            TeamMemberResponse DTO

        Raises:
            ValueError: If invitation is expired or already accepted
            TeamNotFoundException: If team not found
            UnauthorizedException: If user email doesn't match invitation
        """
        # 1. Hash the token to match stored hash
        from hashlib import sha256

        token_hash = sha256(token.encode()).hexdigest()

        # 2. Get invitation by token hash
        invitation = await self.invitation_repository.get_by_token(token_hash, tenant_id)
        if not invitation:
            raise ValueError("Invalid invitation token")

        # 2. Validate invitation is still valid
        if invitation.is_expired():
            invitation.mark_expired()
            await self.invitation_repository.update(invitation)
            raise ValueError("Invitation has expired")

        if invitation.status.value == "accepted":
            raise ValueError("Invitation already accepted")

        # 3. Verify team exists
        team = await self.team_repository.get_by_id(invitation.team_id, tenant_id)
        if not team:
            raise TeamNotFoundException(str(invitation.team_id))

        # 4. Check if user is already a member
        existing_members = await self.team_member_repository.get_by_team(
            team_id=invitation.team_id,
            tenant_id=tenant_id,
        )
        for member in existing_members:
            if member.user_id == user_id:
                raise ValueError("User is already a member of this team")

        # 5. Add user to team
        member = team.add_member(
            user_id=user_id,
            role=TeamMemberRole(invitation.role),
            commission_rate=None,  # Use default commission rate
        )

        # 6. Persist team member
        member = await self.team_member_repository.create(member)

        # 7. Update team
        await self.team_repository.update(team)

        # 8. Mark invitation as accepted
        invitation.accept()
        await self.invitation_repository.update(invitation)

        return TeamMemberResponse.from_entity(member)
