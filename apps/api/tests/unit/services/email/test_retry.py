"""Tests for the transient-error retry decorator used by email transport."""

from __future__ import annotations

import pytest

from prosell.infrastructure.services.email.retry import (
    TransientEmailError,
    retry_on_transient_error,
)


@pytest.mark.asyncio
async def test_retries_then_succeeds():
    """Decorator retries on TransientEmailError and returns the eventual success value."""
    calls = {"n": 0}

    @retry_on_transient_error(max_retries=2, initial_delay=0)
    async def flaky():
        calls["n"] += 1
        if calls["n"] < 2:
            raise TransientEmailError("503 boom")
        return "ok"

    assert await flaky() == "ok"
    assert calls["n"] == 2


@pytest.mark.asyncio
async def test_non_transient_raises_immediately():
    """Non-transient exceptions propagate on first attempt without retry."""
    calls = {"n": 0}

    @retry_on_transient_error(max_retries=3, initial_delay=0)
    async def boom():
        calls["n"] += 1
        raise ValueError("nope")

    with pytest.raises(ValueError):
        await boom()
    assert calls["n"] == 1


@pytest.mark.asyncio
async def test_exhausts_retries_then_raises_last_transient_error():
    """After max_retries exhausted, the last TransientEmailError is re-raised."""
    calls = {"n": 0}

    @retry_on_transient_error(max_retries=2, initial_delay=0)
    async def always_transient():
        calls["n"] += 1
        raise TransientEmailError(f"503 attempt {calls['n']}")

    with pytest.raises(TransientEmailError) as excinfo:
        await always_transient()
    # max_retries=2 means 3 total attempts (initial + 2 retries)
    assert calls["n"] == 3
    assert "attempt 3" in str(excinfo.value)
