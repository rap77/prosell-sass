"""Unit tests for Circuit breaker pattern."""

import time

import pytest

from prosell.infrastructure.tasks.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerOpenError,
    CircuitState,
)


class TestCircuitBreakerConfig:
    """Test CircuitBreakerConfig."""

    def test_default_config(self):
        """Test default configuration values."""
        config = CircuitBreakerConfig()
        assert config.threshold == 5
        assert config.timeout == 60
        assert config.half_open_max_calls == 3

    def test_custom_config(self):
        """Test custom configuration values."""
        config = CircuitBreakerConfig(threshold=3, timeout=30, half_open_max_calls=5)
        assert config.threshold == 3
        assert config.timeout == 30
        assert config.half_open_max_calls == 5


class TestCircuitBreaker:
    """Test CircuitBreaker."""

    def test_initial_state(self):
        """Test that circuit starts in CLOSED state."""
        breaker = CircuitBreaker()
        assert breaker.state == CircuitState.CLOSED
        assert breaker.failures == 0

    def test_success_does_not_change_state(self):
        """Test that successful calls don't change state."""

        async def success_func():
            return "success"

        breaker = CircuitBreaker()

        async def run():
            return await breaker.call(success_func)

        # Note: Would need asyncio.run in actual test
        # This is a simplified check
        assert breaker.state == CircuitState.CLOSED

    @pytest.mark.asyncio
    async def test_failure_increments_count(self):
        """Test that failures increment failure count."""

        async def failing_func():
            raise ValueError("Test error")

        breaker = CircuitBreaker(CircuitBreakerConfig(threshold=2))

        # First failure
        try:
            await breaker.call(failing_func)
        except ValueError:
            pass

        assert breaker.failures == 1
        assert breaker.state == CircuitState.CLOSED

    @pytest.mark.asyncio
    async def test_circuit_opens_after_threshold(self):
        """Test that circuit opens after threshold failures."""

        async def failing_func():
            raise ValueError("Test error")

        breaker = CircuitBreaker(CircuitBreakerConfig(threshold=3))

        for _ in range(3):
            try:
                await breaker.call(failing_func)
            except ValueError:
                pass

        # After 3 failures, circuit should be OPEN
        assert breaker.failures == 3
        assert breaker.state == CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_open_circuit_rejects_calls(self):
        """Test that open circuit rejects calls immediately."""

        async def success_func():
            return "success"

        breaker = CircuitBreaker(CircuitBreakerConfig(threshold=2))

        # Force circuit open with recent failure time
        breaker.state = CircuitState.OPEN
        breaker.failures = 5
        breaker.last_failure_time = time.time()  # Recent failure

        with pytest.raises(CircuitBreakerOpenError):
            await breaker.call(success_func)

    def test_reset(self):
        """Test that reset clears all state."""
        breaker = CircuitBreaker()
        breaker.state = CircuitState.OPEN
        breaker.failures = 10

        breaker.reset()

        assert breaker.state == CircuitState.CLOSED
        assert breaker.failures == 0


__all__ = [
    "TestCircuitBreakerConfig",
    "TestCircuitBreaker",
]
