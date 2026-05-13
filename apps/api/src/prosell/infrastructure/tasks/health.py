"""Task queue health check.

Provides health status for task queue system.
"""

from dataclasses import dataclass


@dataclass
class TaskQueueHealth:
    """Task queue health status."""

    status: str  # "healthy", "unhealthy", "degraded"
    broker_type: str  # "redis" or "memory"
    broker_connected: bool
    workers_active: int | None = None
    message: str = ""


async def get_task_queue_health() -> TaskQueueHealth:
    """Get task queue health status.

    Returns:
        TaskQueueHealth object with current status
    """
    from prosell.core.config import settings

    # Determine broker type
    if settings.environment == "testing":
        broker_type = "memory"
        broker_connected = True  # InMemoryBroker always works
        message = "InMemory broker (testing mode)"
    else:
        broker_type = "redis"
        # Try to connect to Redis
        try:
            import redis.asyncio as redis

            client: redis.Redis = redis.from_url(
                settings.redis_url,
                password=settings.redis_password,
                decode_responses=True,
            )
            await client.ping()
            await client.close()
            broker_connected = True
            message = f"Redis broker at {settings.redis_url}"
        except Exception as e:
            broker_connected = False
            message = f"Redis connection failed: {e}"

    # Determine overall status
    status = "healthy" if broker_connected else "unhealthy"

    return TaskQueueHealth(
        status=status,
        broker_type=broker_type,
        broker_connected=broker_connected,
        workers_active=None,  # Worker count tracking to be implemented
        message=message,
    )


__all__ = ["TaskQueueHealth", "get_task_queue_health"]
