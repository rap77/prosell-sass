"""OrganizationInvitation entity - Pure domain logic with no external dependencies."""

import secrets
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from hashlib import sha256
from uuid import UUID, uuid4

from prosell.domain.base import DomainModel, Field


class OrganizationInvitationStatus(StrEnum):
    """Organization invitation lifecycle status.

    - PENDING: Initial state when invitation is created
    - ACCEPTED: Invitee accepted and a User was created for them
    - EXPIRED: Invitation expired (7 days default)
    - CANCELLED: Invitation was cancelled by the inviting staff member
    """

    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class OrganizationInvitation(DomainModel):
    """Invitation for a new dealer owner to claim an Organization staff created."""

    id: UUID
    organization_id: UUID
    email: str = Field(..., min_length=1, max_length=255)
    token: str = Field(..., min_length=64, max_length=64)  # SHA256 hash
    expires_at: datetime
    status: OrganizationInvitationStatus = Field(default=OrganizationInvitationStatus.PENDING)
    tenant_id: UUID
    created_by_user_id: UUID
    accepted_by_user_id: UUID | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        organization_id: UUID,
        email: str,
        tenant_id: UUID,
        created_by_user_id: UUID,
        expires_in_days: int = 7,
    ) -> "OrganizationInvitation":
        """Factory method for a new dealer-owner invitation, with a secure token."""
        random_token = secrets.token_urlsafe(32)
        token_hash = sha256(random_token.encode()).hexdigest()

        now = datetime.now(UTC)
        return cls(
            id=uuid4(),
            organization_id=organization_id,
            email=email.lower().strip(),
            token=token_hash,
            expires_at=now + timedelta(days=expires_in_days),
            status=OrganizationInvitationStatus.PENDING,
            tenant_id=tenant_id,
            created_by_user_id=created_by_user_id,
            accepted_by_user_id=None,
            created_at=now,
            updated_at=now,
        )

    def is_expired(self) -> bool:
        """Check if the invitation's expiry has passed."""
        return datetime.now(UTC) > self.expires_at

    def accept(self, accepted_by_user_id: UUID) -> None:
        """Accept the invitation.

        Raises:
            ValueError: If invitation is expired or already accepted.
        """
        if self.is_expired():
            raise ValueError("Cannot accept expired invitation")
        if self.status == OrganizationInvitationStatus.ACCEPTED:
            raise ValueError("Invitation already accepted")

        self.status = OrganizationInvitationStatus.ACCEPTED
        self.accepted_by_user_id = accepted_by_user_id
        self.updated_at = datetime.now(UTC)

    def cancel(self) -> None:
        """Cancel the invitation.

        Raises:
            ValueError: If invitation was already accepted.
        """
        if self.status == OrganizationInvitationStatus.ACCEPTED:
            raise ValueError("Cannot cancel accepted invitation")

        self.status = OrganizationInvitationStatus.CANCELLED
        self.updated_at = datetime.now(UTC)

    def mark_expired(self) -> None:
        """Mark the invitation as expired."""
        self.status = OrganizationInvitationStatus.EXPIRED
        self.updated_at = datetime.now(UTC)
