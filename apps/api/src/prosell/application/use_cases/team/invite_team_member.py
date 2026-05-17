"""Invite team member use case."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from prosell.application.dto.team import TeamInvitationResponse
from prosell.application.ports.email_service import AbstractEmailService
from prosell.domain.entities.team_invitation import TeamInvitation, TeamInvitationStatus
from prosell.domain.exceptions.org_exceptions import TeamNotFoundException
from prosell.domain.repositories.team_invitation_repository import (
    AbstractTeamInvitationRepository,
)
from prosell.domain.repositories.team_repository import (
    AbstractTeamRepository,
)


class InviteTeamMemberUseCase:
    """Invite a user to join a team via email."""

    def __init__(
        self,
        team_repository: AbstractTeamRepository,
        invitation_repository: AbstractTeamInvitationRepository,
        email_service: AbstractEmailService,
    ) -> None:
        self.team_repository = team_repository
        self.invitation_repository = invitation_repository
        self.email_service = email_service

    async def execute(
        self,
        team_id: UUID,
        email: str,
        role: str,
        tenant_id: UUID,
        inviter_name: str,
        expires_in_days: int = 7,
    ) -> TeamInvitationResponse:
        """
        Execute invite team member use case.

        Args:
            team_id: Team UUID
            email: Email address of the invitee
            role: Role to assign (vendor or manager)
            tenant_id: Tenant UUID for isolation
            inviter_name: Name of the person sending the invitation
            expires_in_days: Number of days until expiration (default: 7)

        Returns:
            TeamInvitationResponse DTO

        Raises:
            TeamNotFoundException: If team not found
            ValueError: If invitation already exists for this email
        """
        # 1. Verify team exists
        team = await self.team_repository.get_by_id(team_id, tenant_id)
        if not team:
            raise TeamNotFoundException(str(team_id))

        # 2. Check for existing pending invitation
        existing_invitation = await self.invitation_repository.get_pending_by_team_and_email(
            team_id=team_id,
            email=email,
            tenant_id=tenant_id,
        )

        if existing_invitation:
            # If invitation is still pending and not expired, return it
            if not existing_invitation.is_expired():
                return TeamInvitationResponse.from_entity(existing_invitation)
            # Otherwise, mark old invitation as expired and create new one
            existing_invitation.mark_expired()
            await self.invitation_repository.update(existing_invitation)

        # 3. Generate token for email (URL-safe)
        import secrets
        from hashlib import sha256

        email_token = secrets.token_urlsafe(32)
        token_hash = sha256(email_token.encode()).hexdigest()

        # 4. Create invitation with token hash
        invitation = TeamInvitation(
            id=uuid4(),
            team_id=team_id,
            email=email,
            role=role,
            token=token_hash,  # Store hash, not raw token
            expires_at=datetime.now(UTC) + timedelta(days=expires_in_days),
            status=TeamInvitationStatus.PENDING,
            tenant_id=tenant_id,
        )

        # 5. Persist invitation
        invitation = await self.invitation_repository.create(invitation)

        # 6. Send invitation email with raw token
        await self.email_service.send_team_invitation(
            email=email,
            team_name=team.name,
            inviter_name=inviter_name,
            invitation_token=email_token,
            role=role,
        )

        return TeamInvitationResponse.from_entity(invitation)
