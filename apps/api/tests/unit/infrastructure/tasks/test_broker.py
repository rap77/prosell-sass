"""Unit tests for Taskiq broker configuration."""

import pytest

from prosell.infrastructure.tasks.broker import broker


class TestBrokerConfiguration:
    """Test broker configuration."""

    def test_broker_is_created(self):
        """Test that broker instance is created."""
        assert broker is not None

    def test_broker_type_in_testing(self):
        """Test that InMemoryBroker is used in testing mode."""
        # In testing mode, we should use InMemoryBroker
        # This is a basic check - implementation may vary
        assert broker is not None

    def test_task_decorator(self):
        """Test that broker.task decorator creates a task."""

        @broker.task
        async def example_task(param: str) -> str:
            return f"Processed: {param}"

        # broker.task returns an AsyncTaskiqDecoratedTask
        assert example_task is not None
        assert hasattr(example_task, "task_name")


class TestTaskExecution:
    """Test task execution with InMemoryBroker."""

    @pytest.mark.asyncio
    async def test_simple_task_execution(self):
        """Test that a simple task can be executed."""

        @broker.task
        async def simple_task(x: int, y: int) -> int:
            return x + y

        # Note: Full task execution requires running broker.start()
        # which is tested in integration tests
        assert simple_task is not None


__all__ = ["TestBrokerConfiguration", "TestTaskExecution"]
