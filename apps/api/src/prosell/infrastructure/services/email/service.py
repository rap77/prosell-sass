"""EmailService — composes a renderer and a sender to implement the port.

This is the infrastructure-layer adapter for :class:`AbstractEmailService`
(the domain port). The split is intentional:

- **content** lives in :class:`EmailTemplateRenderer` (Jinja2 templates)
- **transport** lives in :class:`EmailSender` (LoggingSender for dev,
  ResendSender for prod)
- **composition** lives here — and **only here** the retry decorator is
  applied, so a transient Resend failure is retried without re-rendering
  the template (rendering is deterministic with the same args).
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from prosell.infrastructure.services.email.retry import retry_on_transient_error

if TYPE_CHECKING:
    from prosell.domain.entities.appointment import AppointmentStatus
    from prosell.domain.ports.i_email_service import AppointmentReminderDetails
    from prosell.infrastructure.services.email.message import EmailMessage
    from prosell.infrastructure.services.email.renderer import EmailTemplateRenderer
    from prosell.infrastructure.services.email.sender import EmailSender


class EmailService:
    """Implements :class:`AbstractEmailService` by rendering content then sending it.

    Each public method corresponds 1:1 to a method on the domain port.
    The private :meth:`_deliver` is the single chokepoint where retry is
    applied — re-rendering on retry would be wasted work since render is
    deterministic with the same args.
    """

    def __init__(self, renderer: EmailTemplateRenderer, sender: EmailSender) -> None:
        self._renderer = renderer
        self._sender = sender

    @retry_on_transient_error()
    async def _deliver(self, message: EmailMessage) -> None:
        await self._sender.send(message)

    async def send_verification_email(self, email: str, user_id: UUID, token: str) -> None:
        await self._deliver(self._renderer.render_verification(email, user_id, token))

    async def send_password_reset(self, email: str, token: str) -> None:
        await self._deliver(self._renderer.render_password_reset(email, token))

    async def send_2fa_enabled(self, email: str) -> None:
        await self._deliver(self._renderer.render_2fa_enabled(email))

    async def send_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        await self._deliver(
            self._renderer.render_appointment_confirmation(
                buyer_email, buyer_name, branch_name, vehicle_info, scheduled_at, notes
            )
        )

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
        await self._deliver(
            self._renderer.render_appointment_status_update(
                buyer_email, buyer_name, branch_name, vehicle_info, scheduled_at, new_status, notes
            )
        )

    async def send_appointment_reminder(
        self,
        email: str,
        person_type: str,
        appointment_details: AppointmentReminderDetails,
    ) -> None:
        await self._deliver(
            self._renderer.render_appointment_reminder(email, person_type, appointment_details)
        )

    async def send_team_invitation(
        self,
        email: str,
        team_name: str,
        inviter_name: str,
        invitation_token: str,
        role: str,
    ) -> None:
        await self._deliver(
            self._renderer.render_team_invitation(
                email, team_name, inviter_name, invitation_token, role
            )
        )
