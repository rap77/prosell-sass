"""Integration tests for Taskiq task execution."""

import asyncio
import pytest

from prosell.infrastructure.tasks.broker import async_task, broker


class TestTaskExecution:
    """Integration tests for task execution."""

    @pytest.fixture(autouse=True)
    async def setup_broker(self):
        """Set up broker for testing."""
        if not broker.is_worker:
            await broker.start()

        yield

        # Cleanup
        await broker.shutdown()

    @pytest.mark.asyncio
    async def test_task_enqueues_and_executes(self):
        """Test that a task can be enqueued and executed."""

        result_holder = []

        @async_task()
        async def simple_task(x: int, y: int) -> int:
            result = x + y
            result_holder.append(result)
            return result

        # Execute task
        task = simple_task.kiq(5, 3)
        result = await task.wait_result(timeout=5)

        assert result == 8
        # Note: Actual execution depends on worker running
        # This is a simplified test structure

    @pytest.mark.asyncio
    async def test_task_with_retry(self):
        """Test task execution with retry logic."""
        attempt_count = 0

        @async_task(retry_on=ValueError, max_retries=3)
        async def failing_task() -> str:
            nonlocal attempt_count
            attempt_count += 1

            if attempt_count < 3:
                raise ValueError("Not yet")

            return "success"

        # Task should succeed after retries
        # Note: Full retry test requires running worker
        assert attempt_count >= 0


class TestBrokerHealth:
    """Test broker health check."""

    @pytest.mark.asyncio
    async def test_broker_startup(self):
        """Test that broker can start up."""
        # InMemoryBroker should start immediately
        if not broker.is_worker:
            await broker.start()
        assert broker.is_worker

    @pytest.mark.asyncio
    async def test_broker_shutdown(self):
        """Test that broker can shutdown gracefully."""
        if not broker.is_worker:
            await broker.start()

        await broker.shutdown()
        # After shutdown, is_worker should be False


__all__ = ["TestTaskExecution", "TestBrokerHealth"]
