"""Health check router.

Provides health check endpoints for system status monitoring.
"""

from datetime import UTC, datetime
from typing import Any
from prosell.infrastructure.tasks.health import TaskQueueHealth

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


@router.get("/", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Basic health check endpoint for Docker/container orchestration.

    Returns:
        HealthResponse with status and timestamp
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.get("/integrations", response_model=IntegrationsHealthResponse)
async def health_check() -> IntegrationsHealthResponse:
    """Health check for all integrations (task queue, redis, database).

    Returns:
        IntegrationsHealthResponse with status of all integrations
    """
    return IntegrationsHealthResponse(
        status="healthy",
        timestamp=datetime.now(UTC).isoformat(),
        task_queue={
            "status": (await get_task_queue_health()).status,
            "broker_type": (await get_task_queue_health()).broker_type,
            "broker_connected": (await get_task_queue_health()).broker_connected,
            "workers_active": (await get_task_queue_health()).workers_active,
            "message": (await get_task_queue_health()).message,
        },
        # Add more integrations as needed
        # "redis": await get_redis_health(),
        # "database": await get_database_health(),
    )


@router.get("/ping", response_model=PingResponse)
async def ping() -> PingResponse:
    """Simple ping endpoint for uptime monitoring.

    Returns:
        PingResponse with pong
    """
    return PingResponse(ping="pong")


__all__ = ["router"]
