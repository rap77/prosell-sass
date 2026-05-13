"""Taskiq broker configuration with Redis.

This module configures the Taskiq broker for async task execution.
Uses Redis for production, InMemoryBroker for testing.
"""

from taskiq import InMemoryBroker, TaskiqDepends
from taskiq_redis import ListQueueBroker

from prosell.core.config import settings

# Use Redis for production, InMemory for tests
if settings.environment == "testing":
    broker: InMemoryBroker | ListQueueBroker = InMemoryBroker()
else:
    broker = ListQueueBroker(
        url=settings.redis_url,
    )

# Example: @broker.task
# Usage:
# @broker.task
# async def my_task(param: str) -> str:
#     return f"Processed: {param}"


__all__ = ["TaskiqDepends", "broker"]
