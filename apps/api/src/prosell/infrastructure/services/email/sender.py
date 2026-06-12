"""Email transport adapters (provider-specific).

Defines the :class:`EmailSender` port (how to deliver a fully rendered
:class:`EmailMessage`) and the concrete adapters that implement it.
:class:`LoggingSender` is the dev/staging adapter — it logs the message
and delivers nothing. The production Resend adapter lives alongside in
this same module once Task 10 lands.
"""

from __future__ import annotations

import logging
from typing import Protocol

from prosell.infrastructure.services.email.message import EmailMessage

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    """Transport port: send a fully rendered :class:`EmailMessage`."""

    async def send(self, message: EmailMessage) -> None: ...


class LoggingSender:
    """Dev/staging sender — logs the message instead of delivering it.

    Replaces the old ``MockEmailService`` and, unlike its predecessor, does
    not duplicate email content: it just emits what the renderer already
    produced. The HTML body is logged with ``%r`` so newlines and unicode
    render correctly in the log handler.
    """

    async def send(self, message: EmailMessage) -> None:
        logger.info(
            "MOCK EMAIL: to=%s subject=%r body=%r",
            message.to,
            message.subject,
            message.html_body,
        )
