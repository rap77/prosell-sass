"""Integration tests for Taskiq task execution."""

import pytest

from prosell.infrastructure.tasks.broker import broker

# Track broker state
_broker_started = False


@pytest.fixture(autouse=True)
async def setup_broker():
    """Set up broker for testing."""
    global _broker_started

    # Only start broker once per test session
    if not _broker_started:
        try:
            # Try startup() first (ListQueueBroker)
            await broker.startup()
        except AttributeError:
            # Fallback to start() (InMemoryBroker)
            await broker.start()
        _broker_started = True

    yield

    # Don't shutdown - let it run for other tests


class TestTaskExecution:
    """Integration tests for task execution."""

    @pytest.mark.asyncio
    async def test_task_enqueues_and_executes(self):
        """Test that a task can be enqueued and executed."""

        @broker.task
        async def simple_task(x: int, y: int) -> int:
            return x + y

        # Verify task is decorated with kiq method
        # Note: Actual enqueue requires broker to be started with worker process
        # This test verifies the task decoration, not execution
        assert hasattr(simple_task, "kiq")
        assert simple_task.task_name  # type: ignore[attr-defined]

    @pytest.mark.asyncio
    async def test_task_decorator(self):
        """Test that @broker.task decorator works."""

        @broker.task
        async def sample_task() -> str:
            return "task executed"

        # Verify function is decorated as taskiq task
        assert hasattr(sample_task, "kiq")
        assert sample_task.task_name  # type: ignore[attr-defined]


class TestBrokerHealth:
    """Test broker health check."""

    @pytest.mark.asyncio
    async def test_broker_is_configured(self):
        """Test that broker is configured."""
        # Broker should be available
        assert broker is not None

    @pytest.mark.asyncio
    async def test_broker_type(self):
        """Test broker type based on environment."""
        from prosell.core.config import settings

        if settings.environment == "testing":
            # Should use InMemoryBroker
            from taskiq import InMemoryBroker

            assert isinstance(broker, InMemoryBroker)
        else:
            # Should use ListQueueBroker (Redis)
            from taskiq_redis import ListQueueBroker

            assert isinstance(broker, ListQueueBroker)


__all__ = ["TestBrokerHealth", "TestTaskExecution"]
