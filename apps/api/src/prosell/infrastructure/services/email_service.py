"""Email service for sending emails (SendGrid)."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from datetime import datetime
from functools import wraps
from typing import TYPE_CHECKING, Any, Callable, Protocol
from uuid import UUID

from prosell.core.config import settings

if TYPE_CHECKING:
    from prosell.domain.entities.appointment import AppointmentStatus

logger = logging.getLogger(__name__)


def retry_on_sendgrid_error(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_multiplier: float = 2.0,
    retryable_statuses: tuple[int, ...] = (
        500,
        502,
        503,
        504,
    ),
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """
    Decorator to retry SendGrid API calls with exponential backoff.

    Args:
        max_retries: Maximum number of retry attempts (default: 3)
        initial_delay: Initial delay in seconds before first retry (default: 1.0)
        backoff_multiplier: Multiplier for exponential backoff (default: 2.0)
        retryable_statuses: HTTP status codes that trigger retry
            (default: 500, 502, 503, 504)

    Returns:
        Decorated function with retry logic
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            delay = initial_delay
            last_exception = None

            for attempt in range(max_retries + 1):  # +1 for initial attempt
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    # Check if error message contains a retryable status code
                    is_retryable = any(
                        str(code) in str(e) for code in retryable_statuses
                    )

                    if not is_retryable or attempt == max_retries:
                        # Not retryable or max retries exceeded
                        raise

                    # Log retry attempt
                    logger.warning(
                        f"SendGrid API call failed (attempt {attempt + 1}/"
                        f"{max_retries + 1}): {e}. "
                        f"Retrying in {delay:.1f}s..."
                    )

                    # Wait before retry with exponential backoff
                    await asyncio.sleep(delay)
                    delay *= backoff_multiplier

            # Should never reach here, but just in case
            if last_exception:
                raise last_exception

        return wrapper

    return decorator


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

    async def send_appointment_notification(
        self,
        branch_email: str,
        branch_name: str,
        buyer_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Send appointment notification to branch."""
        ...

    async def send_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Send appointment confirmation to buyer."""
        ...

    async def send_appointment_reminder(
        self,
        email: str,
        person_type: str,  # "branch" or "buyer"
        appointment_details: dict[str, Any],
    ) -> None:
        """Send appointment reminder."""
        ...

    async def send_appointment_status_update(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        new_status: AppointmentStatus,
        notes: str | None = None,
    ) -> None:
        """Send appointment status update (confirmed/cancelled) to buyer."""
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

    @retry_on_sendgrid_error()
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
                <p><a href="{verification_url}" style="background-color:#4CAF50;
                color:white;padding:10px 20px;text-decoration:none;
                display:inline-block;">Verify Email</a></p>
                <p>Or copy and paste this link into your browser:</p>
                <p>{verification_url}</p>
                <p>This link expires in 24 hours.</p>
                <p>If you didn't create an account, please ignore this email.</p>
            </body>
            </html>
            """,
        )

        # Send email
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
        response: Any = await sg.send(message)

        # Log delivery status
        if response.status_code in (200, 202):
            logger.info(
                f"Email sent successfully: type=verification, to={email}, "
                f"status={response.status_code}"
            )
        else:
            logger.error(
                f"Email delivery failed: type=verification, to={email}, "
                f"status={response.status_code}, body={response.body}"
            )
            raise Exception(
                f"SendGrid error: {response.status_code} - {response.body}"
            )

    @retry_on_sendgrid_error()
    async def send_password_reset(
        self,
        email: str,
        token: str,
    ) -> None:
        """Send password reset email."""
        import sendgrid
        from sendgrid.helpers.mail import Mail

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
                <p>We received a request to reset your password. Click the button
                below:</p>
                <p><a href="{reset_url}" style="background-color:#4CAF50;
                color:white;padding:10px 20px;text-decoration:none;
                display:inline-block;">Reset Password</a></p>
                <p>Or copy and paste this link into your browser:</p>
                <p>{reset_url}</p>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
            </body>
            </html>
            """,
        )

        # Send email
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
        response: Any = await sg.send(message)

        # Log delivery status
        if response.status_code in (200, 202):
            logger.info(
                f"Email sent successfully: type=password_reset, to={email}, "
                f"status={response.status_code}"
            )
        else:
            logger.error(
                f"Email delivery failed: type=password_reset, to={email}, "
                f"status={response.status_code}, body={response.body}"
            )
            raise Exception(
                f"SendGrid error: {response.status_code} - {response.body}"
            )

    @retry_on_sendgrid_error()
    async def send_2fa_enabled(
        self,
        email: str,
    ) -> None:
        """Send 2FA enabled notification."""
        import sendgrid
        from sendgrid.helpers.mail import Mail

        # Create email message
        message = Mail(
            from_email=self.from_email,
            to_emails=email,
            subject=(
                "Two-factor authentication enabled"
            ),
            html_content="""
            <html>
            <body>
                <h2>2FA Enabled Successfully</h2>
                <p>Two-factor authentication has been enabled on your ProSell
                account.</p>
                <p>Your account is now more secure.</p>
                <p>If you didn't make this change, please contact support
                immediately.</p>
            </body>
            </html>
            """,
        )

        # Send email
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
        response: Any = await sg.send(message)

        # Log delivery status
        if response.status_code in (200, 202):
            logger.info(
                f"Email sent successfully: type=2fa_enabled, to={email}, "
                f"status={response.status_code}"
            )
        else:
            logger.error(
                f"Email delivery failed: type=2fa_enabled, to={email}, "
                f"status={response.status_code}, body={response.body}"
            )
            raise Exception(
                f"SendGrid error: {response.status_code} - {response.body}"
            )

    @retry_on_sendgrid_error()
    async def send_appointment_notification(
        self,
        branch_email: str,
        branch_name: str,
        buyer_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Send appointment notification to branch."""
        import sendgrid
        from sendgrid.helpers.mail import Mail

        # Format datetime for display
        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")

        # Build notes row if notes exist
        notes_row = (
            f'<tr style="background-color: #f2f2f2;">'
            f'<td style="border: 1px solid #ddd;"><strong>Notas:</strong></td>'
            f'<td style="border: 1px solid #ddd;">{notes}</td></tr>'
            if notes
            else ""
        )

        # Create email message
        message = Mail(
            from_email=self.from_email,
            to_emails=branch_email,
            subject=f"Nueva Cita Agendada - {buyer_name}",
            html_content=f"""
            <html>
            <body>
                <h2>Nueva Cita Agendada</h2>
                <p>Hola <strong>{branch_name}</strong>,</p>
                <p>Tienes una nueva cita agendada:</p>
                <table cellpadding="5" style="border-collapse: collapse;
                border: 1px solid #ddd;">
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;">
                        <strong>Comprador:</strong></td>
                        <td style="border: 1px solid #ddd;">{buyer_name}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd;"><strong>Vehículo:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{vehicle_info}</td>
                    </tr>
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Fecha y Hora:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{scheduled_str}</td>
                    </tr>
                    {notes_row}
                </table>
                {f'<p><strong>Notas:</strong> {notes}</p>' if notes else ''}
                <p>Por favor asegúrate de estar disponible para esta cita.</p>
                <p>Si necesitas reprogramar, contacta a tu administrador.</p>
            </body>
            </html>
            """,
        )

        # Send email
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
        response: Any = await sg.send(message)

        # Log delivery status
        if response.status_code in (200, 202):
            logger.info(
                f"Email sent successfully: type=appointment_notification, "
                f"to={branch_email}, buyer={buyer_name}, vehicle={vehicle_info}, "
                f"status={response.status_code}"
            )
        else:
            logger.error(
                f"Email delivery failed: type=appointment_notification, "
                f"to={branch_email}, status={response.status_code}, "
                f"body={response.body}"
            )
            raise Exception(
                f"SendGrid error: {response.status_code} - {response.body}"
            )

    @retry_on_sendgrid_error()
    async def send_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Send appointment confirmation to buyer."""
        import sendgrid
        from sendgrid.helpers.mail import Mail

        # Format datetime for display
        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")

        # Build notes row if notes exist
        notes_row = (
            f'<tr style="background-color: #f2f2f2;">'
            f'<td style="border: 1px solid #ddd;"><strong>Notas:</strong></td>'
            f'<td style="border: 1px solid #ddd;">{notes}</td></tr>'
            if notes
            else ""
        )

        # Create email message
        message = Mail(
            from_email=self.from_email,
            to_emails=buyer_email,
            subject="Confirmación de Cita - ProSell",
            html_content=f"""
            <html>
            <body>
                <h2>Confirmación de Cita</h2>
                <p>Hola <strong>{buyer_name}</strong>,</p>
                <p>Tu cita ha sido confirmada:</p>
                <table cellpadding="5" style="border-collapse: collapse;
                border: 1px solid #ddd;">
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Asesor:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{branch_name}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd;"><strong>Vehículo:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{vehicle_info}</td>
                    </tr>
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Fecha y Hora:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{scheduled_str}</td>
                    </tr>
                    {notes_row}
                </table>
                {f'<p><strong>Notas:</strong> {notes}</p>' if notes else ''}
                <p>Por favor llega 10 minutos antes de tu cita.</p>
                <p>Si necesitas reprogramar, responde a este correo o contáctanos.</p>
            </body>
            </html>
            """,
        )

        # Send email
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
        response: Any = await sg.send(message)

        # Log delivery status
        if response.status_code in (200, 202):
            logger.info(
                f"Email sent successfully: type=appointment_confirmation, "
                f"to={buyer_email}, branch={branch_name}, vehicle={vehicle_info}, "
                f"status={response.status_code}"
            )
        else:
            logger.error(
                f"Email delivery failed: type=appointment_confirmation, "
                f"to={buyer_email}, status={response.status_code}, "
                f"body={response.body}"
            )
            raise Exception(
                f"SendGrid error: {response.status_code} - {response.body}"
            )

    @retry_on_sendgrid_error()
    async def send_appointment_reminder(
        self,
        email: str,
        person_type: str,  # "branch" or "buyer"
        appointment_details: dict[str, Any],
    ) -> None:
        """Send appointment reminder."""
        import sendgrid
        from sendgrid.helpers.mail import Mail

        buyer_name = appointment_details.get("buyer_name", "Cliente")
        branch_name = appointment_details.get("branch_name", "Asesor")
        vehicle_info = appointment_details.get("vehicle_info", "Vehículo")
        scheduled_at = appointment_details.get("scheduled_at", datetime.now())
        notes = appointment_details.get("notes")

        # Format datetime for display
        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")

        # Build notes row if notes exist
        notes_row = (
            f'<tr style="background-color: #f2f2f2;">'
            f'<td style="border: 1px solid #ddd;"><strong>Notas:</strong></td>'
            f'<td style="border: 1px solid #ddd;">{notes}</td></tr>'
            if notes
            else ""
        )

        # Customize message based on recipient type
        if person_type == "branch":
            greeting = f"Hola <strong>{branch_name}</strong>,"
            instructions = "Por favor asegúrate de estar disponible para esta cita."
        else:  # buyer
            greeting = f"Hola <strong>{buyer_name}</strong>,"
            instructions = "Por favor llega 10 minutos antes de tu cita."

        # Create email message
        message = Mail(
            from_email=self.from_email,
            to_emails=email,
            subject="Recordatorio de Cita - ProSell",
            html_content=f"""
            <html>
            <body>
                <h2>Recordatorio de Cita</h2>
                <p>{greeting}</p>
                <p>Este es un recordatorio de tu próxima cita:</p>
                <table cellpadding="5" style="border-collapse: collapse;
                border: 1px solid #ddd;">
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Fecha y Hora:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{scheduled_str}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd;"><strong>Vehículo:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{vehicle_info}</td>
                    </tr>
                    {notes_row}
                </table>
                <p>{instructions}</p>
                <p>Si necesitas reprogramar, contáctanos lo antes posible.</p>
            </body>
            </html>
            """,
        )

        # Send email
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
        response: Any = await sg.send(message)

        # Log delivery status
        if response.status_code in (200, 202):
            logger.info(
                f"Email sent successfully: type=appointment_reminder, to={email}, "
                f"person_type={person_type}, status={response.status_code}"
            )
        else:
            logger.error(
                f"Email delivery failed: type=appointment_reminder, to={email}, "
                f"status={response.status_code}, body={response.body}"
            )
            raise Exception(
                f"SendGrid error: {response.status_code} - {response.body}"
            )

    @retry_on_sendgrid_error()
    async def send_appointment_status_update(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        new_status: AppointmentStatus,
        notes: str | None = None,
    ) -> None:
        """Send appointment status update (confirmed/cancelled) to buyer."""
        # Import here to avoid circular dependency
        from prosell.domain.entities.appointment import AppointmentStatus

        import sendgrid
        from sendgrid.helpers.mail import Mail

        # Format datetime for display
        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")

        # Determine email content based on status
        if new_status == AppointmentStatus.COMPLETED:
            subject = "[ProSell] Appointment Confirmed"
            status_text = "confirmed"
            status_message = "Your appointment has been confirmed"
        elif new_status == AppointmentStatus.CANCELLED:
            subject = "[ProSell] Appointment Cancelled"
            status_text = "cancelled"
            status_message = "Your appointment has been cancelled"
        else:
            # Fallback for other statuses (shouldn't happen)
            subject = "[ProSell] Appointment Status Update"
            status_text = new_status.value
            status_message = f"Your appointment status has been updated to: {new_status.value}"

        # Build notes row if notes exist
        notes_section = (
            f'<tr style="background-color: #f2f2f2;">'
            f'<td style="border: 1px solid #ddd;"><strong>Notas:</strong></td>'
            f'<td style="border: 1px solid #ddd;">{notes}</td></tr>'
            if notes
            else ""
        )

        # Create email message
        message = Mail(
            from_email=self.from_email,
            to_emails=buyer_email,
            subject=subject,
            html_content=f"""
            <html>
            <body>
                <h2>{status_message}</h2>
                <p>Hola <strong>{buyer_name}</strong>,</p>
                <p>El estado de tu cita ha sido actualizado:</p>
                <table cellpadding="5" style="border-collapse: collapse;
                border: 1px solid #ddd;">
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Estado:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{status_text.title()}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd;"><strong>Asesor:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{branch_name}</td>
                    </tr>
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Vehículo:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{vehicle_info}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd;"><strong>Fecha y Hora:
                        </strong></td>
                        <td style="border: 1px solid #ddd;">{scheduled_str}</td>
                    </tr>
                    {notes_section}
                </table>
                {f'<p><strong>Notas:</strong> {notes}</p>' if notes else ''}
                <p>Si tienes alguna pregunta, contáctanos.</p>
            </body>
            </html>
            """,
        )

        # Send email
        sg = sendgrid.SendGridAPIClient(api_key=self.api_key)
        response: Any = await sg.send(message)

        # Log delivery status
        if response.status_code in (200, 202):
            logger.info(
                f"Email sent successfully: type=appointment_status_update, "
                f"to={buyer_email}, status={new_status.value}, "
                f"appointment_date={scheduled_str}"
            )
        else:
            logger.error(
                f"Email delivery failed: type=appointment_status_update, "
                f"to={buyer_email}, status={response.status_code}, "
                f"body={response.body}"
            )
            raise Exception(
                f"SendGrid error: {response.status_code} - {response.body}"
            )


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

    async def send_appointment_notification(
        self,
        branch_email: str,
        branch_name: str,
        buyer_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Log appointment notification to branch."""
        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")
        print(f"""
{"=" * 60}
📧 MOCK EMAIL: Appointment Notification (Branch)
{"=" * 60}
To: {branch_email}
Subject: Nueva Cita Agendada - {buyer_name}

Hola {branch_name},

Tienes una nueva cita agendada:
  Comprador: {buyer_name}
  Vehículo: {vehicle_info}
  Fecha y Hora: {scheduled_str}
{f'  Notas: {notes}' if notes else ''}

Por favor asegúrate de estar disponible para esta cita.
{"=" * 60}
        """)

    async def send_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Log appointment confirmation to buyer."""
        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")
        print(f"""
{"=" * 60}
📧 MOCK EMAIL: Appointment Confirmation (Buyer)
{"=" * 60}
To: {buyer_email}
Subject: Confirmación de Cita - ProSell

Hola {buyer_name},

Tu cita ha sido confirmada:
  Asesor: {branch_name}
  Vehículo: {vehicle_info}
  Fecha y Hora: {scheduled_str}
{f'  Notas: {notes}' if notes else ''}

Por favor llega 10 minutos antes de tu cita.
{"=" * 60}
        """)

    async def send_appointment_reminder(
        self,
        email: str,
        person_type: str,  # "branch" or "buyer"
        appointment_details: dict[str, Any],
    ) -> None:
        """Log appointment reminder."""
        _buyer_name = appointment_details.get("buyer_name", "Cliente")
        _branch_name = appointment_details.get("branch_name", "Asesor")
        vehicle_info = appointment_details.get("vehicle_info", "Vehículo")
        scheduled_at = appointment_details.get("scheduled_at", datetime.now())
        notes = appointment_details.get("notes")

        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")

        if person_type == "branch":
            instructions = "Por favor asegúrate de estar disponible para esta cita."
        else:  # buyer
            instructions = "Por favor llega 10 minutos antes de tu cita."

        print(f"""
{"=" * 60}
📧 MOCK EMAIL: Appointment Reminder ({person_type.title()})
{"=" * 60}
To: {email}
Subject: Recordatorio de Cita - ProSell

Este es un recordatorio de tu próxima cita:
  Fecha y Hora: {scheduled_str}
  Vehículo: {vehicle_info}
{f'  Notas: {notes}' if notes else ''}

{instructions}
{"=" * 60}
        """)

    async def send_appointment_status_update(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        new_status: AppointmentStatus,
        notes: str | None = None,
    ) -> None:
        """Log appointment status update to buyer."""
        # Import here to avoid circular dependency
        from prosell.domain.entities.appointment import AppointmentStatus

        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")

        if new_status == AppointmentStatus.COMPLETED:
            status_text = "confirmed"
            status_message = "Your appointment has been confirmed"
        elif new_status == AppointmentStatus.CANCELLED:
            status_text = "cancelled"
            status_message = "Your appointment has been cancelled"
        else:
            status_text = new_status.value
            status_message = f"Your appointment status has been updated to: {new_status.value}"

        print(f"""
{"=" * 60}
📧 MOCK EMAIL: Appointment Status Update ({status_text.title()})
{"=" * 60}
To: {buyer_email}
Subject: [ProSell] Appointment {status_text.title()}

Hola {buyer_name},

{status_message}:
  Asesor: {branch_name}
  Vehículo: {vehicle_info}
  Fecha y Hora: {scheduled_str}
{f'  Notas: {notes}' if notes else ''}

If you have any questions, contact us.
{"=" * 60}
        """)
