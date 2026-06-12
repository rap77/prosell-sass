"""Jinja2-based email content renderer (provider-agnostic)."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING
from uuid import UUID

from jinja2 import Environment, FileSystemLoader, select_autoescape

from prosell.core.config import settings
from prosell.infrastructure.services.email.message import EmailMessage

if TYPE_CHECKING:
    from datetime import datetime

    from prosell.domain.entities.appointment import AppointmentStatus

_TEMPLATES_DIR = Path(__file__).parent / "templates"


class EmailTemplateRenderer:
    """Renders semantic email requests into EmailMessage value objects."""

    def __init__(self) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(_TEMPLATES_DIR)),
            autoescape=select_autoescape(["html"]),
        )

    def _base_url(self) -> str:
        return settings.oauth_frontend_success_url.split("/auth")[0]

    def _render(self, template: str, subject: str, to: str, /, **ctx: object) -> EmailMessage:
        body = self._env.get_template(template).render(**ctx)
        return EmailMessage(to=to, subject=subject, html_body=body)

    def render_verification(self, email: str, user_id: UUID, token: str) -> EmailMessage:
        _ = user_id
        verification_url = f"{self._base_url()}/auth/verify?token={token}"
        return self._render(
            "verification.html",
            "Verify your ProSell account",
            email,
            verification_url=verification_url,
        )

    def render_password_reset(self, email: str, token: str) -> EmailMessage:
        reset_url = f"{self._base_url()}/auth/reset-password?token={token}"
        return self._render(
            "password_reset.html",
            "Reset your ProSell password",
            email,
            reset_url=reset_url,
        )

    def render_2fa_enabled(self, email: str) -> EmailMessage:
        return self._render(
            "2fa_enabled.html",
            "Two-factor authentication enabled",
            email,
        )

    def render_team_invitation(
        self,
        email: str,
        team_name: str,
        inviter_name: str,
        invitation_token: str,
        role: str,
    ) -> EmailMessage:
        invitation_url = f"{self._base_url()}/invite/accept?token={invitation_token}"
        return self._render(
            "team_invitation.html",
            f"[ProSell] You've been invited to join {team_name}",
            email,
            inviter_name=inviter_name,
            team_name=team_name,
            role=role,
            invitation_url=invitation_url,
        )

    def render_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> EmailMessage:
        return self._render(
            "appointment_confirmation.html",
            "Confirmación de Cita - ProSell",
            buyer_email,
            buyer_name=buyer_name,
            branch_name=branch_name,
            vehicle_info=vehicle_info,
            scheduled_str=scheduled_at.strftime("%A, %d %B %Y at %I:%M %p"),
            notes=notes,
        )

    def render_appointment_status_update(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        new_status: AppointmentStatus,
        notes: str | None = None,
    ) -> EmailMessage:
        from prosell.domain.entities.appointment import AppointmentStatus as _Status

        if new_status == _Status.COMPLETED:
            subject = "[ProSell] Appointment Confirmed"
            status_text = "Confirmed"
            status_message = "Your appointment has been confirmed"
        elif new_status == _Status.CANCELLED:
            subject = "[ProSell] Appointment Cancelled"
            status_text = "Cancelled"
            status_message = "Your appointment has been cancelled"
        else:
            subject = "[ProSell] Appointment Status Update"
            status_text = new_status.value.title()
            status_message = f"Your appointment status has been updated to: {new_status.value}"
        return self._render(
            "appointment_status_update.html",
            subject,
            buyer_email,
            buyer_name=buyer_name,
            branch_name=branch_name,
            vehicle_info=vehicle_info,
            scheduled_str=scheduled_at.strftime("%A, %d %B %Y at %I:%M %p"),
            status_text=status_text,
            status_message=status_message,
            notes=notes,
        )
