"""Transient-error retry decorator for email transport adapters.

The decorator retries async callables on :class:`TransientEmailError` with
exponential backoff. Other exceptions propagate immediately. After
``max_retries`` exhausted attempts, the last ``TransientEmailError`` is
re-raised with its original traceback preserved.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from functools import wraps
from typing import ParamSpec, TypeVar

logger = logging.getLogger(__name__)

P = ParamSpec("P")
R = TypeVar("R")


class TransientEmailError(Exception):
    """Raised by a sender when the provider returned a retryable status (429/5xx)."""


def retry_on_transient_error(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_multiplier: float = 2.0,
) -> Callable[[Callable[P, Awaitable[R]]], Callable[P, Awaitable[R]]]:
    """Decorate an async callable to retry on :class:`TransientEmailError`.

    Performs up to ``max_retries + 1`` total attempts (one initial + N retries),
    sleeping ``initial_delay`` seconds before the first retry and multiplying
    the delay by ``backoff_multiplier`` after each subsequent retry.

    Non-transient exceptions are not retried. On exhaustion, the last
    ``TransientEmailError`` is re-raised (bare ``raise`` preserves the
    traceback, which the caller wants in logs/monitoring — not a generic
    ``RuntimeError``).
    """

    def decorator(func: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            delay = initial_delay
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except TransientEmailError:
                    if attempt < max_retries:
                        logger.warning(
                            "Transient email error (attempt %d/%d): %s. Retrying in %.1fs",
                            attempt + 1,
                            max_retries + 1,
                            func.__name__,
                            delay,
                        )
                        await asyncio.sleep(delay)
                        delay *= backoff_multiplier
                    else:
                        # Bare raise preserves the original traceback of the
                        # last TransientEmailError — the caller wants to see
                        # the real failure in logs, not a wrapper.
                        raise
            # Unreachable: the for-loop either returns or raises on the
            # final attempt. Defensive assertion keeps pyright happy and
            # documents the invariant.
            raise RuntimeError("retry_on_transient_error exhausted")  # pragma: no cover

        return wrapper

    return decorator
