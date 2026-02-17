"""Session entity for user session management."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from prosell.domain.base import DomainModel


class Session(DomainModel):
    """
    User session entity.

    Tracks active user sessions for security and management.
    """

    # Required fields
    id: UUID
    user_id: UUID
    token_hash: str  # Hashed refresh token
    expires_at: datetime
    created_at: datetime

    # Optional fields with defaults
    user_agent: str | None = None
    ip_address: str | None = None
    revoked_at: datetime | None = None

    @classmethod
    def create(
        cls,
        user_id: UUID,
        token_hash: str,
        expires_days: int = 7,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> "Session":
        """Create a new user session."""
        return cls(
            id=uuid4(),
            user_id=user_id,
            token_hash=token_hash,
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=datetime.now(UTC) + timedelta(days=expires_days),
            revoked_at=None,
            created_at=datetime.now(UTC),
        )

    def is_valid(self) -> bool:
        """Check if session is valid (not expired and not revoked)."""
        if self.revoked_at is not None:
            return False
        return datetime.now(UTC) < self.expires_at

    def revoke(self) -> None:
        """Revoke the session."""
        self.revoked_at = datetime.now(UTC)
