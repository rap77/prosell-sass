"""Invite (or resend an invitation to) a dealer organization's owner."""

import secrets
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from uuid import UUID, uuid4

from prosell.domain.entities.organization_invitation import (
    OrganizationInvitation,
    OrganizationInvitationStatus,
)
from prosell.domain.ports.i_email_service import AbstractEmailService
from prosell.domain.repositories.organization_invitation_repository import (
    AbstractOrganizationInvitationRepository,
)


class InviteDealerOwnerUseCase:
    """Create-or-reuse a pending OrganizationInvitation and email it.

    Called both at dealer-org creation time and by the standalone resend
    endpoint — kept as its own use case so a lost/expired invite email has a
    recovery path that doesn't require recreating the organization.

    Does NOT use `OrganizationInvitation.create()` for new invitations:
    that factory hashes its token immediately and discards the raw value,
    so nothing could ever email a usable link. `invite_team_member.py:79-92`
    has the exact same constraint and solves it the same way — generate the
    raw token here, hash it for storage, keep the raw value in a local
    variable long enough to email it.
    """

    def __init__(
        self,
        invitation_repository: AbstractOrganizationInvitationRepository,
        email_service: AbstractEmailService,
    ) -> None:
        self.invitation_repository = invitation_repository
        self.email_service = email_service

    @staticmethod
    def _generate_token() -> tuple[str, str]:
        """Generate a (raw_token, token_hash) pair. Raw goes in the email link;
        only the hash is ever persisted — mirrors invite_team_member.py."""
        raw_token = secrets.token_urlsafe(32)
        return raw_token, sha256(raw_token.encode()).hexdigest()

    def _new_invitation(
        self, organization_id: UUID, email: str, tenant_id: UUID, created_by_user_id: UUID
    ) -> tuple[OrganizationInvitation, str]:
        """Build a PENDING invitation entity + the raw token for its email link."""
        raw_token, token_hash = self._generate_token()
        now = datetime.now(UTC)
        invitation = OrganizationInvitation(
            id=uuid4(),
            organization_id=organization_id,
            email=email.lower().strip(),
            token=token_hash,
            expires_at=now + timedelta(days=7),
            status=OrganizationInvitationStatus.PENDING,
            tenant_id=tenant_id,
            created_by_user_id=created_by_user_id,
            accepted_by_user_id=None,
            created_at=now,
            updated_at=now,
        )
        return invitation, raw_token

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
            # Reusing an existing pending invitation — we don't have its raw
            # token (only the stored hash), so we cannot re-send the exact
            # same link. Issue a fresh token for the same invitation row
            # instead of silently resending an un-sendable one.
            raw_token, token_hash = self._generate_token()
            existing.token = token_hash
            existing.updated_at = datetime.now(UTC)
            await self.invitation_repository.update(existing)
            invitation, send_token = existing, raw_token
        else:
            if existing is not None:
                existing.mark_expired()
                await self.invitation_repository.update(existing)
            new_invitation, raw_token = self._new_invitation(
                organization_id, email, tenant_id, created_by_user_id
            )
            invitation = await self.invitation_repository.create(new_invitation)
            send_token = raw_token

        # Not caught — propagates to roll back the caller's transaction when
        # called from CreateDealerOrganizationUseCase (Task 9). Consistent
        # with invite_team_member.py, which has the same non-handling.
        await self.email_service.send_org_invitation(
            email=invitation.email,
            organization_name=organization_name,
            inviter_name=inviter_name,
            invitation_token=send_token,
        )

        return invitation
