"""Invite (or resend an invitation to) a organization organization's owner."""

from uuid import UUID

from prosell.domain.entities.organization_invitation import (
    OrganizationInvitation,
)
from prosell.domain.ports.i_email_service import AbstractEmailService
from prosell.domain.repositories.organization_invitation_repository import (
    AbstractOrganizationInvitationRepository,
)


class InviteOrganizationOwnerUseCase:
    """Create-or-reuse a pending OrganizationInvitation and email it.

    Called both at organization-org creation time and by the standalone resend
    endpoint — kept as its own use case so a lost/expired invite email has a
    recovery path that doesn't require recreating the organization.

    Token generation and expiry-reset live on the `OrganizationInvitation`
    entity (`build_pending` for new rows, `regenerate_token` for the reuse
    branch). The raw token is never persisted — only its SHA-256 hash is —
    so 'resend' must always reissue (see `invite_team_member.py:79-92`).
    """

    def __init__(
        self,
        invitation_repository: AbstractOrganizationInvitationRepository,
        email_service: AbstractEmailService,
    ) -> None:
        self.invitation_repository = invitation_repository
        self.email_service = email_service

    async def execute(
        self,
        organization_id: UUID,
        organization_name: str,
        email: str,
        tenant_id: UUID,
        inviter_name: str,
        created_by_user_id: UUID,
    ) -> OrganizationInvitation:
        existing = await self.invitation_repository.get_pending_by_org_and_email(
            organization_id=organization_id, email=email, tenant_id=tenant_id
        )

        if existing is not None and not existing.is_expired():
            # Reusing an existing pending invitation — issue a fresh token
            # AND a fresh expiry window for the same row.
            send_token = existing.regenerate_token()
            await self.invitation_repository.update(existing)
            invitation = existing
        else:
            if existing is not None:
                existing.mark_expired()
                await self.invitation_repository.update(existing)
            new_invitation, send_token = OrganizationInvitation.build_pending(
                organization_id=organization_id,
                email=email,
                tenant_id=tenant_id,
                created_by_user_id=created_by_user_id,
            )
            invitation = await self.invitation_repository.create(new_invitation)

        # Not caught — propagates to roll back the caller's transaction when
        # called from CreateOrganizationUseCase (Task 9). Consistent
        # with invite_team_member.py, which has the same non-handling.
        await self.email_service.send_org_invitation(
            email=invitation.email,
            organization_name=organization_name,
            inviter_name=inviter_name,
            invitation_token=send_token,
        )

        return invitation
