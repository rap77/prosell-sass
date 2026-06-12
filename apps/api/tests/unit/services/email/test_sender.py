"""Tests for the email transport adapter :class:`LoggingSender`."""

from __future__ import annotations

import logging

import pytest

from prosell.infrastructure.services.email.message import EmailMessage
from prosell.infrastructure.services.email.sender import LoggingSender


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
