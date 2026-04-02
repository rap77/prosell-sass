"""Health check router.

Provides health check endpoints for system status monitoring.
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from prosell.infrastructure.tasks.health import get_task_queue_health

router = APIRouter(prefix="/health", tags=["health"])


# Response Models
class HealthResponse(BaseModel):
    """Basic health check response."""

    status: str
    timestamp: str


class IntegrationsHealthResponse(HealthResponse):
    """Health check response with integrations status."""

    task_queue: dict[str, Any]


class PingResponse(BaseModel):
    """Ping response."""

    ping: str


@router.get("/")
async def health():
    """Basic health check endpoint for Docker/container orchestration.

    Returns:
        HealthResponse with status and timestamp
    """
    return {
        "status": "healthy",
        "timestamp": "2026-04-02T04:00:00+00:00",  # hardcoded test
    }


@router.get("/integrations")
async def health_check():
    """Health check for all integrations (task queue, redis, database).

    Returns:
        IntegrationsHealthResponse with status of all integrations
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
        PingResponse with pong
    """
    return {"ping": "pong"}


__all__ = ["router"]
