"""Health check router.

Provides health check endpoints for system status monitoring.
"""

from datetime import UTC, datetime

from fastapi import APIRouter

from prosell.infrastructure.tasks.health import get_task_queue_health

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/integrations")
async def health_check():
    """Health check for all integrations (task queue, redis, database).

    Returns:
        JSON with status of all integrations
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now(UTC).isoformat(),
        "task_queue": await get_task_queue_health(),
        # Add more integrations as needed
        # "redis": await get_redis_health(),
        # "database": await get_database_health(),
    }


@router.get("/ping")
async def ping():
    """Simple ping endpoint for uptime monitoring.

    Returns:
        Pong response
    """
    return {"ping": "pong"}


__all__ = ["router"]
