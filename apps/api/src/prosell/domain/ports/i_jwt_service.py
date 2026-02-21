"""JWT service interface (port) for secondary actor."""

from typing import Any, Protocol
from uuid import UUID


class IJWTService(Protocol):
    """
    Interface for JWT token generation and verification.

    This is a secondary port (interface) that the infrastructure layer
    must implement. The application layer depends on this interface,
    not on the concrete implementation.
    """

    def generate_access_token(
        self,
        user_id: UUID,
        roles: list[str],
    ) -> str:
        """
        Generate JWT access token.

        Args:
            user_id: User UUID
            roles: List of role names

        Returns:
            Encoded JWT access token
        """
        ...

    def generate_refresh_token(self, user_id: UUID) -> str:
        """
        Generate JWT refresh token.

        Args:
            user_id: User UUID

        Returns:
            Encoded JWT refresh token
        """
        ...

    def verify_token(self, token: str) -> dict[str, Any]:
        """
        Verify and decode JWT token.

        Args:
            token: JWT token to verify

        Returns:
            Decoded token payload

        Raises:
            ValueError: If token is invalid or expired
        """
        ...

    def decode_token_without_verification(self, token: str) -> dict[str, Any]:
        """
        Decode token without verification (for debugging).

        Args:
            token: JWT token to decode

        Returns:
            Decoded token payload
        """
        ...
