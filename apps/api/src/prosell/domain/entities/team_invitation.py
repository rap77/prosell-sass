"""TeamInvitation entity - Pure domain logic with no external dependencies."""

import secrets
from datetime import UTC, datetime
from enum import StrEnum
from hashlib import sha256
from uuid import UUID, uuid4

from prosell.domain.base import DomainModel, Field


class TeamInvitationStatus(StrEnum):
    """Team invitation lifecycle status.

    Represents the 4-state invitation lifecycle:
    - PENDING: Initial state when invitation is created
    - ACCEPTED: Invitee has accepted the invitation
    - EXPIRED: Invitation has expired (7 days)
    - CANCELLED: Invitation was cancelled by the sender
    """

    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

    def is_pending(self) -> bool:
        """Check if invitation is pending."""
        return self == TeamInvitationStatus.PENDING

    def is_accepted(self) -> bool:
        """Check if invitation was accepted."""
        return self == TeamInvitationStatus.ACCEPTED

    def is_expired(self) -> bool:
        """Check if invitation is expired."""
        return self == TeamInvitationStatus.EXPIRED

    def __str__(self) -> str:
        return self.value


class TeamInvitation(DomainModel):
    """
    TeamInvitation entity.

    Represents an invitation for a user to join a team.
    Includes a secure token for acceptance and expiration logic.
    """

    # Required fields
    id: UUID
    team_id: UUID
    email: str = Field(..., min_length=1, max_length=255)
    role: str  # TeamMemberRole enum value (stored as string for flexibility)
    token: str = Field(..., min_length=64, max_length=64)  # SHA256 hash
    expires_at: datetime
    status: TeamInvitationStatus = Field(default=TeamInvitationStatus.PENDING)
    tenant_id: UUID  # For multi-tenant isolation

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        team_id: UUID,
        email: str,
        role: str,
        tenant_id: UUID,
        expires_in_days: int = 7,
    ) -> "TeamInvitation":
        """
        Factory method for new team invitation creation.

        Args:
            team_id: Team UUID
            email: Email address of the invitee
            role: Role to assign (TeamMemberRole enum value)
            tenant_id: Tenant UUID for isolation
            expires_in_days: Number of days until expiration (default: 7)

        Returns:
            New TeamInvitation entity with secure token
        """
        # Generate secure random token
        random_token = secrets.token_urlsafe(32)
        token_hash = sha256(random_token.encode()).hexdigest()

        from datetime import timedelta

        now = datetime.now(UTC)
        expires_at = now + timedelta(days=expires_in_days)

        return cls(
            id=uuid4(),
            team_id=team_id,
            email=email.lower().strip(),  # Normalize email
            role=role,
            token=token_hash,
            expires_at=expires_at,
            status=TeamInvitationStatus.PENDING,
            tenant_id=tenant_id,
            created_at=now,
            updated_at=now,
        )

    def is_expired(self) -> bool:
        """
        Check if invitation has expired.

        Returns:
            True if expiration date has passed, False otherwise
        """
        return datetime.now(UTC) > self.expires_at

    def accept(self) -> None:
        """
        Accept the invitation.

        Raises:
            ValueError: If invitation is expired or already accepted
        """
        if self.is_expired():
            raise ValueError("Cannot accept expired invitation")

        if self.status == TeamInvitationStatus.ACCEPTED:
            raise ValueError("Invitation already accepted")

        self.status = TeamInvitationStatus.ACCEPTED
        self.updated_at = datetime.now(UTC)

    def cancel(self) -> None:
        """
        Cancel the invitation.

        Raises:
            ValueError: If invitation was already accepted
        """
        if self.status == TeamInvitationStatus.ACCEPTED:
            raise ValueError("Cannot cancel accepted invitation")

        self.status = TeamInvitationStatus.CANCELLED
        self.updated_at = datetime.now(UTC)

    def mark_expired(self) -> None:
        """Mark the invitation as expired."""
        self.status = TeamInvitationStatus.EXPIRED
        self.updated_at = datetime.now(UTC)

    @property
    def days_until_expiration(self) -> int:
        """Calculate days until expiration (negative if expired)."""
        delta = self.expires_at - datetime.now(UTC)
        return delta.days
