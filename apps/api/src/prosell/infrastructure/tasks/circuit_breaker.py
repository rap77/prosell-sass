"""Circuit breaker pattern for external service failures.

Prevents cascade failures by failing fast when external service
is experiencing issues.
"""

from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from time import time


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject tasks
    HALF_OPEN = "half_open"  # Testing if recovered


class CircuitBreakerOpenError(Exception):
    """Raised when circuit is OPEN and tasks should fail fast."""

    pass


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration."""

    threshold: int = 5  # Failures before opening
    timeout: int = 60  # Seconds before attempting reset
    half_open_max_calls: int = 3  # Max calls in HALF_OPEN state


class CircuitBreaker:
    """Circuit breaker for external service failures.

    State transitions:
    CLOSED → OPEN: After threshold failures
    OPEN → HALF_OPEN: After timeout expires
    HALF_OPEN → CLOSED: On first success
    HALF_OPEN → OPEN: On any failure
    """

    def __init__(self, config: CircuitBreakerConfig | None = None):
        """Initialize circuit breaker.

        Args:
            config: Circuit breaker configuration
        """
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failures = 0
        self.last_failure_time = 0.0
        self.half_open_calls = 0

    async def call(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection.

        Args:
            func: Async function to call
            *args: Function arguments
            **kwargs: Function keyword arguments

        Returns:
            Function result

        Raises:
            CircuitBreakerOpenError: If circuit is OPEN
            Exception: If function raises an exception
        """
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
            else:
                raise CircuitBreakerOpenError(
                    f"Circuit is OPEN (failures: {self.failures}). "
                    f"Reset in {self.config.timeout - (time() - self.last_failure_time):.0f}s"
                )

        if self.state == CircuitState.HALF_OPEN:
            self.half_open_calls += 1
            if self.half_open_calls > self.config.half_open_max_calls:
                # Too many calls in HALF_OPEN, open circuit again
                self.state = CircuitState.OPEN
                self.last_failure_time = time()
                raise CircuitBreakerOpenError("Circuit HALF_OPEN timeout - too many calls")

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _should_attempt_reset(self) -> bool:
        """Check if timeout has passed to attempt reset.

        Returns:
            True if timeout expired
        """
        return time() - self.last_failure_time > self.config.timeout

    def _on_success(self):
        """Handle successful call."""
        self.failures = 0
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED

    def _on_failure(self):
        """Handle failed call."""
        self.failures += 1
        self.last_failure_time = time()

        if (
            self.state == CircuitState.CLOSED
            and self.failures >= self.config.threshold
        ):
            self.state = CircuitState.OPEN
        elif self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            self.last_failure_time = time()

    def get_state(self) -> CircuitState:
        """Get current circuit state.

        Returns:
            Current circuit state
        """
        return self.state

    def reset(self):
        """Reset circuit breaker to CLOSED state."""
        self.state = CircuitState.CLOSED
        self.failures = 0
        self.last_failure_time = 0.0
        self.half_open_calls = 0


__all__ = [
    "CircuitState",
    "CircuitBreakerOpenError",
    "CircuitBreakerConfig",
    "CircuitBreaker",
]
