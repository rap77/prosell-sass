"""OAuth repository interface (Port in Clean Architecture)."""

from datetime import datetime
from typing import Protocol
from uuid import UUID


class AbstractOAuthRepository(Protocol):
    """
    OAuth repository interface.

    This is a Port in Clean Architecture terminology.
    The Infrastructure layer will implement this (Adapter).
    """

    async def link_oauth_account(
        self,
        user_id: UUID,
        provider: str,
        provider_user_id: str,
        provider_email: str | None = None,
        access_token: str | None = None,
        refresh_token: str | None = None,
        expires_at: datetime | None = None,
    ) -> None:
        """
        Link an OAuth account to a user.

        Args:
            user_id: User UUID to link the OAuth account to
            provider: OAuth provider name (e.g., "google", "facebook")
            provider_user_id: User ID from the OAuth provider
            provider_email: Email from the OAuth provider
            access_token: OAuth access token
            refresh_token: OAuth refresh token
            expires_at: Token expiration datetime

        Returns:
            None
        """
        ...

    async def unlink_oauth_account(
        self,
        user_id: UUID,
        provider: str,
    ) -> bool:
        """
        Unlink an OAuth account from a user.

        Args:
            user_id: User UUID
            provider: OAuth provider name

        Returns:
            True if unlinked, False if not found
        """
        ...

    async def get_user_oauth_providers(self, user_id: UUID) -> list[dict[str, str | int]]:
        """
        Get all OAuth providers linked to a user.

        Args:
            user_id: User UUID

        Returns:
            List of dicts with provider info (provider, provider_user_id, etc.)
        """
        ...
