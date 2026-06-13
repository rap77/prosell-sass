"""Tests for :class:`EmailService` — composes renderer and sender to implement the port."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest

from prosell.infrastructure.services.email.message import EmailMessage
from prosell.infrastructure.services.email.renderer import EmailTemplateRenderer
from prosell.infrastructure.services.email.retry import TransientEmailError
from prosell.infrastructure.services.email.service import EmailService


class _SpySender:
    """Test double that records every message handed to it."""

    def __init__(self) -> None:
        self.sent: list[EmailMessage] = []
        # Allow tests to override behavior per-call.
        self.raise_with: BaseException | None = None
        self.raise_count: int = 0

    async def send(self, message: EmailMessage) -> None:
        if self.raise_with is not None:
            self.raise_count += 1
            raise self.raise_with
        self.sent.append(message)


class _SpyRenderer:
    """Records calls and returns a deterministic fake EmailMessage per template."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple[Any, ...]]] = []

    def _record(self, method: str, *args: Any) -> EmailMessage:
        self.calls.append((method, args))
        return EmailMessage(to=args[0] if args else "spy@x.com", subject=method, html_body=method)

    def render_verification(self, email: str, user_id: Any, token: str) -> EmailMessage:
        return self._record("render_verification", email, user_id, token)

    def render_password_reset(self, email: str, token: str) -> EmailMessage:
        return self._record("render_password_reset", email, token)

    def render_2fa_enabled(self, email: str) -> EmailMessage:
        return self._record("render_2fa_enabled", email)

    def render_appointment_confirmation(self, *args: Any) -> EmailMessage:
        return self._record("render_appointment_confirmation", *args)

    def render_appointment_status_update(self, *args: Any) -> EmailMessage:
        return self._record("render_appointment_status_update", *args)

    def render_appointment_reminder(self, *args: Any) -> EmailMessage:
        return self._record("render_appointment_reminder", *args)

    def render_team_invitation(self, *args: Any) -> EmailMessage:
        return self._record("render_team_invitation", *args)


# ---------------------------------------------------------------------------
# Happy-path: service renders and sends.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_service_renders_and_sends_verification() -> None:
    """The renderer is called with the args, the produced message is forwarded to the sender."""
    spy = _SpySender()
    svc = EmailService(EmailTemplateRenderer(), spy)  # type: ignore[arg-type]
    await svc.send_verification_email(email="u@x.com", user_id=uuid4(), token="tok")
    assert len(spy.sent) == 1
    assert spy.sent[0].to == "u@x.com"
    assert "token=tok" in spy.sent[0].html_body


@pytest.mark.asyncio
async def test_service_satisfies_port() -> None:
    """EmailService is structurally compatible with AbstractEmailService."""
    from prosell.domain.ports.i_email_service import AbstractEmailService

    svc: AbstractEmailService = EmailService(EmailTemplateRenderer(), _SpySender())  # type: ignore[arg-type]
    assert svc is not None


# ---------------------------------------------------------------------------
# Composition: spy on the renderer to verify which method was called.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_service_dispatches_to_correct_renderer_method() -> None:
    """Each port method calls the matching render_* method exactly once."""
    spy_sender = _SpySender()
    spy_renderer = _SpyRenderer()
    svc = EmailService(spy_renderer, spy_sender)  # type: ignore[arg-type]

    await svc.send_verification_email(email="a@x.com", user_id=uuid4(), token="t1")
    await svc.send_password_reset(email="a@x.com", token="t2")
    await svc.send_2fa_enabled(email="a@x.com")
    await svc.send_team_invitation(
        email="a@x.com", team_name="T", inviter_name="I", invitation_token="tok", role="r"
    )

    methods_called = [m for m, _ in spy_renderer.calls]
    assert methods_called == [
        "render_verification",
        "render_password_reset",
        "render_2fa_enabled",
        "render_team_invitation",
    ]
    assert len(spy_sender.sent) == 4


# ---------------------------------------------------------------------------
# Retry-on-transient: when the sender raises TransientEmailError, the service
# retries via the @retry_on_transient_error decorator.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_service_retries_on_transient_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """A transient sender error is retried; the call eventually succeeds."""
    # Make the retry decorator's sleep effectively zero so the test is fast.
    import asyncio

    async def _no_sleep(_seconds: float) -> None:
        return None

    monkeypatch.setattr(asyncio, "sleep", _no_sleep)

    spy = _SpySender()
    call_count = {"n": 0}
    original_send = spy.send

    async def flaky_send(message: EmailMessage) -> None:
        call_count["n"] += 1
        if call_count["n"] < 3:
            raise TransientEmailError("503 boom")
        await original_send(message)

    spy.send = flaky_send  # type: ignore[method-assign]

    real_renderer = EmailTemplateRenderer()
    svc = EmailService(real_renderer, spy)  # type: ignore[arg-type]
    await svc.send_2fa_enabled(email="a@x.com")
    assert call_count["n"] == 3  # 2 failures + 1 success
    assert len(spy.sent) == 1


@pytest.mark.asyncio
async def test_service_does_not_retry_on_non_transient_error() -> None:
    """A non-transient error (e.g. ValueError) propagates immediately, no retry."""
    spy = _SpySender()
    spy.raise_with = ValueError("bad request")

    svc = EmailService(EmailTemplateRenderer(), spy)  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        await svc.send_2fa_enabled(email="a@x.com")
    # Called exactly once — no retry on non-transient.
    assert spy.raise_count == 1
