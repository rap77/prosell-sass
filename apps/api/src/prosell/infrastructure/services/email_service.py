"""Email service for sending emails (SendGrid)."""

from typing import Protocol
from uuid import UUID

from prosell.core.config import settings


class AbstractEmailService(Protocol):
    """
    Email service interface (Protocol).

    Abstract port for email sending functionality.
    Uses Protocol for duck typing, not ABC inheritance.
    """

    async def send_verification_email(
        self,
        email: str,
        user_id: UUID,
        token: str,
    ) -> None:
        """Send email verification email."""
        ...

    async def send_password_reset(
        self,
        email: str,
        token: str,
    ) -> None:
        """Send password reset email."""
        ...

    async def send_2fa_enabled(
        self,
        email: str,
    ) -> None:
        """Send 2FA enabled notification."""
        ...


class SendGridEmailService:
    """
    SendGrid email service implementation.

    Uses SendGrid API for transactional emails.
    """

    def __init__(self) -> None:
        self.api_key = settings.sendgrid_api_key
        self.from_email = settings.sendgrid_from_email
        self.from_name = settings.sendgrid_from_name

    async def send_verification_email(
        self,
        email: str,
        user_id: UUID,
        token: str,
    ) -> None:
        """Send email verification email."""
        # TODO: Implement SendGrid API call
        pass

    async def send_password_reset(
        self,
        email: str,
        token: str,
    ) -> None:
        """Send password reset email."""
        # TODO: Implement SendGrid API call
        pass

    async def send_2fa_enabled(
        self,
        email: str,
    ) -> None:
        """Send 2FA enabled notification."""
        # TODO: Implement SendGrid API call
        pass


class MockEmailService:
    """
    Mock email service for development.

    Logs emails to console instead of sending them.
    """

    async def send_verification_email(
        self,
        email: str,
        user_id: UUID,
        token: str,
    ) -> None:
        """Log email verification email."""
        print(f"""
{"=" * 60}
📧 MOCK EMAIL: Email Verification Required
{"=" * 60}
To: {email}
Subject: Verify your ProSell account

Please verify your email by clicking the link below:
http://localhost:3000/auth/verify?token={token}

User ID: {user_id}
{"=" * 60}
        """)

    async def send_password_reset(
        self,
        email: str,
        token: str,
    ) -> None:
        """Log password reset email."""
        print(f"""
{"=" * 60}
📧 MOCK EMAIL: Password Reset
{"=" * 60}
To: {email}
Subject: Reset your password

Click the link below to reset your password:
http://localhost:3000/auth/reset-password?token={token}

This link expires in 1 hour.
{"=" * 60}
        """)

    async def send_2fa_enabled(
        self,
        email: str,
    ) -> None:
        """Log 2FA enabled notification."""
        print(f"""
{"=" * 60}
📧 MOCK EMAIL: 2FA Enabled
{"=" * 60}
To: {email}
Subject: Two-factor authentication enabled

Two-factor authentication has been enabled on your account.

If you didn't make this change, please contact support immediately.
{"=" * 60}
        """)
