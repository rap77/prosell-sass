"""Session repository interface (Port in Clean Architecture)."""

from typing import Protocol
from uuid import UUID

from prosell.domain.entities.session import Session


class AbstractSessionRepository(Protocol):
    """
    Session repository interface.

    This is a Port in Clean Architecture terminology.
    The Infrastructure layer will implement this (Adapter).
    """

    async def create(self, session: Session) -> Session:
        """
        Create a new session.

        Args:
            session: Session entity to create

        Returns:
            Created session with generated ID
        """
        ...

    async def get_by_id(self, session_id: UUID) -> Session | None:
        """
        Get session by ID.

        Args:
            session_id: Session UUID

        Returns:
            Session entity or None if not found
        """
        ...

    async def get_by_token_hash(self, token_hash: str) -> Session | None:
        """
        Get session by token hash.

        Args:
            token_hash: Hashed refresh token

        Returns:
            Session entity or None if not found
        """
        ...

    async def update(self, session: Session) -> Session:
        """
        Update session.

        Args:
            session: Session entity with updated fields

        Returns:
            Updated session entity
        """
        ...

    async def delete(self, session_id: UUID) -> None:
        """
        Delete session.

        Args:
            session_id: Session UUID to delete
        """
        ...

    async def revoke_all_user_sessions(self, user_id: UUID) -> None:
        """
        Revoke all sessions for a user.

        Args:
            user_id: User UUID
        """
        ...

    async def delete_expired_sessions(self) -> int:
        """
        Delete all expired sessions.

        Returns:
            Number of sessions deleted
        """
        ...

    async def list_user_sessions(
        self,
        user_id: UUID,
        active_only: bool = True,
    ) -> list[Session]:
        """
        List all sessions for a user.

        Args:
            user_id: User UUID
            active_only: If True, only return non-revoked, non-expired sessions

        Returns:
            List of session entities
        """
        ...
