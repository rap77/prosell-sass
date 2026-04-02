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
        import sendgrid  # type: ignore[import]
        from sendgrid.helpers.mail import Mail  # type: ignore[import]

        # Create verification URL (use oauth_frontend_success_url as base)
        base_url = settings.oauth_frontend_success_url.split("/auth")[0]
        verification_url = f"{base_url}/auth/verify?token={token}"

        # Create email message
        message = Mail(
            from_email=self.from_email,
            to_emails=email,
            subject="Verify your ProSell account",
            html_content=f"""
            <html>
            <body>
                <h2>Welcome to ProSell!</h2>
                <p>Please verify your email address by clicking the button below:</p>
                <p><a href="{verification_url}" style="background-color:#4CAF50;color:white;padding:10px 20px;text-decoration:none;display:inline-block;">Verify Email</a></p>
                <p>Or copy and paste this link into your browser:</p>
                <p>{verification_url}</p>
                <p>This link expires in 24 hours.</p>
                <p>If you didn't create an account, please ignore this email.</p>
            </body>
            </html>
            """,
        )

        # Send email
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)  # type: ignore[call-arg]
        response = await sg.send(message)  # type: ignore[attr-defined]

        # Log response for debugging
        if response.status_code not in (200, 202):  # type: ignore[attr-defined]
            raise Exception(f"SendGrid error: {response.status_code} - {response.body}")  # type: ignore[attr-defined]

    async def send_password_reset(
        self,
        email: str,
        token: str,
    ) -> None:
        """Send password reset email."""
        import sendgrid  # type: ignore[import]
        from sendgrid.helpers.mail import Mail  # type: ignore[import]

        # Create reset URL
        base_url = settings.oauth_frontend_success_url.split("/auth")[0]
        reset_url = f"{base_url}/auth/reset-password?token={token}"

        # Create email message
        message = Mail(
            from_email=self.from_email,
            to_emails=email,
            subject="Reset your ProSell password",
            html_content=f"""
            <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>We received a request to reset your password. Click the button below:</p>
                <p><a href="{reset_url}" style="background-color:#4CAF50;color:white;padding:10px 20px;text-decoration:none;display:inline-block;">Reset Password</a></p>
                <p>Or copy and paste this link into your browser:</p>
                <p>{reset_url}</p>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
            </body>
            </html>
            """,
        )

        # Send email
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)  # type: ignore[call-arg]
        response = await sg.send(message)  # type: ignore[attr-defined]

        # Log response for debugging
        if response.status_code not in (200, 202):  # type: ignore[attr-defined]
            raise Exception(f"SendGrid error: {response.status_code} - {response.body}")  # type: ignore[attr-defined]

    async def send_2fa_enabled(
        self,
        email: str,
    ) -> None:
        """Send 2FA enabled notification."""
        import sendgrid  # type: ignore[import]
        from sendgrid.helpers.mail import Mail  # type: ignore[import]

        # Create email message
        message = Mail(
            from_email=self.from_email,
            to_emails=email,
            subject="Two-factor authentication enabled",
            html_content=f"""
            <html>
            <body>
                <h2>2FA Enabled Successfully</h2>
                <p>Two-factor authentication has been enabled on your ProSell account.</p>
                <p>Your account is now more secure.</p>
                <p>If you didn't make this change, please contact support immediately.</p>
            </body>
            </html>
            """,
        )

        # Send email
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)  # type: ignore[call-arg]
        response = await sg.send(message)  # type: ignore[attr-defined]

        # Log response for debugging
        if response.status_code not in (200, 202):  # type: ignore[attr-defined]
            raise Exception(f"SendGrid error: {response.status_code} - {response.body}")  # type: ignore[attr-defined]


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
