"""Tests for the email transport adapters (:class:`LoggingSender`, :class:`ResendSender`)."""

from __future__ import annotations

import logging

import httpx
import pytest

from prosell.infrastructure.services.email.message import EmailMessage
from prosell.infrastructure.services.email.retry import TransientEmailError
from prosell.infrastructure.services.email.sender import LoggingSender, ResendSender

# ---------------------------------------------------------------------------
# LoggingSender (dev/staging)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_logging_sender_logs_message(caplog: pytest.LogCaptureFixture) -> None:
    """LoggingSender emits an INFO log containing to, subject, and body."""
    sender = LoggingSender()
    msg = EmailMessage(to="a@b.com", subject="Hi there", html_body="<p>hello world</p>")
    with caplog.at_level(logging.INFO):
        await sender.send(msg)
    assert "a@b.com" in caplog.text
    assert "Hi there" in caplog.text
    assert "<p>hello world</p>" in caplog.text


@pytest.mark.asyncio
async def test_logging_sender_logs_each_send_independently(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Two consecutive sends produce two log lines (no state leaks)."""
    sender = LoggingSender()
    with caplog.at_level(logging.INFO):
        await sender.send(EmailMessage(to="one@x.com", subject="S1", html_body="b1"))
        await sender.send(EmailMessage(to="two@x.com", subject="S2", html_body="b2"))
    assert "one@x.com" in caplog.text
    assert "two@x.com" in caplog.text
    # Two distinct log lines, not concatenated.
    assert caplog.text.count("MOCK EMAIL") == 2


# ---------------------------------------------------------------------------
# ResendSender (production) — httpx-based transport
# ---------------------------------------------------------------------------


def _resend(transport: httpx.MockTransport) -> ResendSender:
    """Build a ResendSender with an injected httpx client (no real network)."""
    return ResendSender(
        api_key="re_test",
        from_email="noreply@prosell.saas",
        from_name="ProSell",
        client=httpx.AsyncClient(transport=transport),
    )


@pytest.mark.asyncio
async def test_resend_sender_posts_expected_payload() -> None:
    """ResendSender POSTs to api.resend.com/emails with Bearer auth and the message."""
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("authorization") or ""
        captured["json"] = request.read().decode()
        return httpx.Response(200, json={"id": "e1"})

    sender = _resend(httpx.MockTransport(handler))
    await sender.send(EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>"))

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["auth"] == "Bearer re_test"
    # JSON payload contains the destination email (as a list per Resend API).
    assert '"a@b.com"' in captured["json"]
    assert "<p>x</p>" in captured["json"]


@pytest.mark.asyncio
async def test_resend_sender_raises_transient_on_5xx() -> None:
    """5xx server errors raise TransientEmailError (caller can retry)."""
    sender = _resend(httpx.MockTransport(lambda _: httpx.Response(503)))
    with pytest.raises(TransientEmailError):
        await sender.send(EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>"))


@pytest.mark.asyncio
async def test_resend_sender_raises_transient_on_429() -> None:
    """429 rate-limit responses raise TransientEmailError (retryable)."""
    sender = _resend(httpx.MockTransport(lambda _: httpx.Response(429, text="rate")))
    with pytest.raises(TransientEmailError):
        await sender.send(EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>"))


@pytest.mark.asyncio
async def test_resend_sender_raises_value_on_4xx() -> None:
    """Non-429 4xx (e.g. 422) raises ValueError — not retryable, not transient."""
    sender = _resend(httpx.MockTransport(lambda _: httpx.Response(422, text="bad")))
    with pytest.raises(ValueError):
        await sender.send(EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>"))


@pytest.mark.asyncio
async def test_resend_sender_logs_resend_id_on_success(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Success log includes the Resend message id for correlation with their dashboard."""
    handler = httpx.MockTransport(lambda _: httpx.Response(200, json={"id": "abc-123"}))
    sender = _resend(handler)
    with caplog.at_level(logging.INFO):
        await sender.send(EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>"))
    assert "a@b.com" in caplog.text
    assert "abc-123" in caplog.text


@pytest.mark.asyncio
async def test_resend_sender_does_not_close_injected_client() -> None:
    """The sender must not close a client it did not create (test isolation)."""
    injected_client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"id": "x"})),
    )
    sender = ResendSender(
        api_key="re_test",
        from_email="noreply@prosell.saas",
        from_name="ProSell",
        client=injected_client,
    )
    await sender.send(EmailMessage(to="a@b.com", subject="Hi", html_body="<p>x</p>"))
    # If the sender closed the injected client, this second send would fail.
    await sender.send(EmailMessage(to="b@c.com", subject="Hi2", html_body="<p>y</p>"))
    await injected_client.aclose()  # explicit cleanup by the owner (the test)
