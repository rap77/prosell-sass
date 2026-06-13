"""Email transport adapters (provider-specific).

Defines the :class:`EmailSender` port (how to deliver a fully rendered
:class:`EmailMessage`) and the concrete adapters that implement it.

- :class:`LoggingSender` — dev/staging adapter; logs the message and
  delivers nothing.
- :class:`ResendSender` — production adapter; POSTs to the Resend REST
  API over httpx, with proper status-code handling (429/5xx are
  surfaced as :class:`TransientEmailError` so the composition layer can
  retry them via :func:`retry_on_transient_error`).
"""

from __future__ import annotations

import logging
from typing import Protocol

import httpx

from prosell.infrastructure.services.email.message import EmailMessage
from prosell.infrastructure.services.email.retry import TransientEmailError

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


_RESEND_URL = "https://api.resend.com/emails"


class ResendSender:
    """Production sender — delivers via the Resend REST API over httpx.

    Translates HTTP responses to the language the rest of the email
    subsystem speaks:

    - 2xx → success; the Resend message id is logged so it can be
      correlated with the Resend dashboard.
    - 429 and 5xx → :class:`TransientEmailError` (retryable by
      :func:`retry_on_transient_error` at the composition layer).
    - other 4xx → :class:`ValueError` (not retryable — bad request,
      auth failure, etc.).

    The ``client`` is injectable for testing with ``httpx.MockTransport``.
    When injected, the sender does NOT close it (the test owns the
    lifecycle). When not injected, a private client is created and
    closed per ``send`` call.
    """

    def __init__(
        self,
        api_key: str,
        from_email: str,
        from_name: str,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key = api_key
        # RFC 5322 "From:" form: "Name <email@x.com>".
        self._from_header = f"{from_name} <{from_email}>"
        self._client = client

    async def send(self, message: EmailMessage) -> None:
        payload = {
            "from": self._from_header,
            "to": [message.to],
            "subject": message.subject,
            "html": message.html_body,
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        client = self._client or httpx.AsyncClient()
        try:
            resp = await client.post(_RESEND_URL, json=payload, headers=headers)
        finally:
            if self._client is None:
                await client.aclose()

        if resp.status_code in (200, 201):
            body = resp.json()
            resend_id = body.get("id", "<no-id>")
            logger.info(
                "Email sent via Resend: to=%s status=%d resend_id=%s",
                message.to,
                resp.status_code,
                resend_id,
            )
            return

        if resp.status_code == 429 or resp.status_code >= 500:
            raise TransientEmailError(f"Resend {resp.status_code}: {resp.text}")

        logger.error(
            "Resend delivery failed (non-transient): to=%s status=%d",
            message.to,
            resp.status_code,
        )
        raise ValueError(f"Resend error {resp.status_code}: {resp.text}")
