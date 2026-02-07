"""Email service port (secondary interface)."""

from abc import abstractmethod
from typing import Protocol
from uuid import UUID


class AbstractEmailService(Protocol):
    """
    Email service interface.

    This is a secondary port in Clean Architecture.
    The infrastructure layer implements this (Adapter).
    """

    @abstractmethod
    async def send_verification_email(
        self,
        email: str,
        user_id: UUID,
        token: str,
    ) -> None:
        """Send email verification email."""
        ...

    @abstractmethod
    async def send_password_reset(
        self,
        email: str,
        token: str,
    ) -> None:
        """Send password reset email."""
        ...

    @abstractmethod
    async def send_2fa_enabled(
        self,
        email: str,
    ) -> None:
        """Send 2FA enabled notification."""
        ...
