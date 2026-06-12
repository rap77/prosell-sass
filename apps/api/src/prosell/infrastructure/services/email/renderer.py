"""Jinja2-based email content renderer (provider-agnostic)."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID

from jinja2 import Environment, FileSystemLoader, select_autoescape

from prosell.core.config import settings
from prosell.infrastructure.services.email.message import EmailMessage

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
