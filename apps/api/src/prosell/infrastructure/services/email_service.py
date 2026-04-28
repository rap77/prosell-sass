"""Email service for sending emails (SendGrid)."""

from datetime import datetime
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

    async def send_appointment_notification(
        self,
        dealer_email: str,
        dealer_name: str,
        buyer_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Send appointment notification to dealer."""
        ...

    async def send_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        dealer_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Send appointment confirmation to buyer."""
        ...

    async def send_appointment_reminder(
        self,
        email: str,
        person_type: str,  # "dealer" or "buyer"
        appointment_details: dict,
    ) -> None:
        """Send appointment reminder."""
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
            html_content="""
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

    async def send_appointment_notification(
        self,
        dealer_email: str,
        dealer_name: str,
        buyer_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Send appointment notification to dealer."""
        import sendgrid  # type: ignore[import]
        from sendgrid.helpers.mail import Mail  # type: ignore[import]

        # Format datetime for display
        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")

        # Create email message
        message = Mail(
            from_email=self.from_email,
            to_emails=dealer_email,
            subject=f"Nueva Cita Agendada - {buyer_name}",
            html_content=f"""
            <html>
            <body>
                <h2>Nueva Cita Agendada</h2>
                <p>Hola <strong>{dealer_name}</strong>,</p>
                <p>Tienes una nueva cita agendada:</p>
                <table cellpadding="5" style="border-collapse: collapse; border: 1px solid #ddd;">
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Comprador:</strong></td>
                        <td style="border: 1px solid #ddd;">{buyer_name}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd;"><strong>Vehículo:</strong></td>
                        <td style="border: 1px solid #ddd;">{vehicle_info}</td>
                    </tr>
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Fecha y Hora:</strong></td>
                        <td style="border: 1px solid #ddd;">{scheduled_str}</td>
                    </tr>
                </table>
                {f'<p><strong>Notas:</strong> {notes}</p>' if notes else ''}
                <p>Por favor asegúrate de estar disponible para esta cita.</p>
                <p>Si necesitas reprogramar, contacta a tu administrador.</p>
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

    async def send_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        dealer_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Send appointment confirmation to buyer."""
        import sendgrid  # type: ignore[import]
        from sendgrid.helpers.mail import Mail  # type: ignore[import]

        # Format datetime for display
        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")

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
                <table cellpadding="5" style="border-collapse: collapse; border: 1px solid #ddd;">
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Asesor:</strong></td>
                        <td style="border: 1px solid #ddd;">{dealer_name}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd;"><strong>Vehículo:</strong></td>
                        <td style="border: 1px solid #ddd;">{vehicle_info}</td>
                    </tr>
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Fecha y Hora:</strong></td>
                        <td style="border: 1px solid #ddd;">{scheduled_str}</td>
                    </tr>
                </table>
                {f'<p><strong>Notas:</strong> {notes}</p>' if notes else ''}
                <p>Por favor llega 10 minutos antes de tu cita.</p>
                <p>Si necesitas reprogramar, responde a este correo o contáctanos.</p>
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

    async def send_appointment_reminder(
        self,
        email: str,
        person_type: str,  # "dealer" or "buyer"
        appointment_details: dict,
    ) -> None:
        """Send appointment reminder."""
        import sendgrid  # type: ignore[import]
        from sendgrid.helpers.mail import Mail  # type: ignore[import]

        buyer_name = appointment_details.get("buyer_name", "Cliente")
        dealer_name = appointment_details.get("dealer_name", "Asesor")
        vehicle_info = appointment_details.get("vehicle_info", "Vehículo")
        scheduled_at = appointment_details.get("scheduled_at", datetime.now())
        notes = appointment_details.get("notes")

        # Format datetime for display
        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")

        # Customize message based on recipient type
        if person_type == "dealer":
            greeting = f"Hola <strong>{dealer_name}</strong>,"
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
                <table cellpadding="5" style="border-collapse: collapse; border: 1px solid #ddd;">
                    <tr style="background-color: #f2f2f2;">
                        <td style="border: 1px solid #ddd;"><strong>Fecha y Hora:</strong></td>
                        <td style="border: 1px solid #ddd;">{scheduled_str}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ddd;"><strong>Vehículo:</strong></td>
                        <td style="border: 1px solid #ddd;">{vehicle_info}</td>
                    </tr>
                    {f'<tr style="background-color: #f2f2f2;"><td style="border: 1px solid #ddd;"><strong>Notas:</strong></td><td style="border: 1px solid #ddd;">{notes}</td></tr>' if notes else ''}
                </table>
                <p>{instructions}</p>
                <p>Si necesitas reprogramar, contáctanos lo antes posible.</p>
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

    async def send_appointment_notification(
        self,
        dealer_email: str,
        dealer_name: str,
        buyer_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Log appointment notification to dealer."""
        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")
        print(f"""
{"=" * 60}
📧 MOCK EMAIL: Appointment Notification (Dealer)
{"=" * 60}
To: {dealer_email}
Subject: Nueva Cita Agendada - {buyer_name}

Hola {dealer_name},

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
        dealer_name: str,
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
  Asesor: {dealer_name}
  Vehículo: {vehicle_info}
  Fecha y Hora: {scheduled_str}
{f'  Notas: {notes}' if notes else ''}

Por favor llega 10 minutos antes de tu cita.
{"=" * 60}
        """)

    async def send_appointment_reminder(
        self,
        email: str,
        person_type: str,  # "dealer" or "buyer"
        appointment_details: dict,
    ) -> None:
        """Log appointment reminder."""
        buyer_name = appointment_details.get("buyer_name", "Cliente")
        dealer_name = appointment_details.get("dealer_name", "Asesor")
        vehicle_info = appointment_details.get("vehicle_info", "Vehículo")
        scheduled_at = appointment_details.get("scheduled_at", datetime.now())
        notes = appointment_details.get("notes")

        scheduled_str = scheduled_at.strftime("%A, %d %B %Y at %I:%M %p")

        if person_type == "dealer":
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
