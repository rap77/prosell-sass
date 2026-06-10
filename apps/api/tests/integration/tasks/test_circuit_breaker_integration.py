"""Integration tests for circuit breaker."""

import asyncio
import contextlib

import pytest

from prosell.infrastructure.tasks.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerOpenError,
    CircuitState,
)


class TestCircuitBreakerIntegration:
    """Integration tests for circuit breaker."""

    @pytest.mark.asyncio
    async def test_circuit_opens_after_threshold(self):
        """Test that circuit opens after threshold failures."""
        breaker = CircuitBreaker(CircuitBreakerConfig(threshold=3))

        async def failing_func():
            raise ValueError("Test error")

        # Trigger 3 failures
        for _ in range(3):
            with contextlib.suppress(ValueError):
                await breaker.call(failing_func)

        assert breaker.state == CircuitState.OPEN
        assert breaker.failures == 3

    @pytest.mark.asyncio
    async def test_open_circuit_fails_fast(self):
        """Test that open circuit rejects calls immediately."""
        breaker = CircuitBreaker(CircuitBreakerConfig(threshold=2))

        # Force circuit open
        async def failing_func():
            raise ValueError("Test error")

        for _ in range(2):
            with contextlib.suppress(ValueError):
                await breaker.call(failing_func)

        assert breaker.state == CircuitState.OPEN

        # Next call should fail fast
        async def success_func():
            return "success"

        with pytest.raises(CircuitBreakerOpenError):
            await breaker.call(success_func)

    @pytest.mark.asyncio
    async def test_circuit_resets_after_timeout(self):
        """Test that circuit resets after timeout."""

        breaker = CircuitBreaker(CircuitBreakerConfig(threshold=2, timeout=1))

        # Force circuit open
        async def failing_func():
            raise ValueError("Test error")

        for _ in range(2):
            with contextlib.suppress(ValueError):
                await breaker.call(failing_func)

        assert breaker.state == CircuitState.OPEN

        # Wait for timeout
        await asyncio.sleep(1.1)

        # Circuit should transition to HALF_OPEN
        async def success_func():
            return "success"

        result = await breaker.call(success_func)
        assert result == "success"
        assert breaker.state == CircuitState.CLOSED

    @pytest.mark.asyncio
    async def test_successful_call_resets_failure_count(self):
        """Test that successful call resets failure count."""
        breaker = CircuitBreaker(CircuitBreakerConfig(threshold=3))

        async def conditional_func(should_fail: bool):
            if should_fail:
                raise ValueError("Test error")
            return "success"

        # Fail twice
        for _ in range(2):
            with contextlib.suppress(ValueError):
                await breaker.call(conditional_func, True)

        assert breaker.failures == 2

        # Succeed
        result = await breaker.call(conditional_func, False)
        assert result == "success"

        # Failure count should be reset
        assert breaker.failures == 0
        assert breaker.state == CircuitState.CLOSED


__all__ = ["TestCircuitBreakerIntegration"]
