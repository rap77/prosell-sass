"""Session entity for user session management."""

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4


@dataclass
class Session:
    """
    User session entity.

    Tracks active user sessions for security and management.
    """

    id: UUID
    user_id: UUID
    token_hash: str  # Hashed refresh token
    user_agent: str | None
    ip_address: str | None
    expires_at: datetime
    revoked_at: datetime | None
    created_at: datetime

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
            expires_at=datetime.now(UTC) + __import__("datetime").timedelta(days=expires_days),
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
