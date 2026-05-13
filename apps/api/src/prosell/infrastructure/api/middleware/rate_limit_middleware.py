"""Rate limiting middleware using slowapi for FastAPI."""

from collections.abc import Callable
from typing import Any, cast

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from prosell.core.config import settings


def get_identifier(request: Request) -> str:
    """
    Get rate limit identifier from request.

    Priority:
    1. User ID from JWT (if authenticated)
    2. IP address from X-Forwarded-For (if trusted proxy)
    3. IP address from direct connection
    """
    # Try to get user ID from JWT token (set by auth middleware)
    if hasattr(request.state, "user_id") and request.state.user_id:
        return f"user:{request.state.user_id}"

    # Try X-Forwarded-For header (if behind proxy)
    if settings.rate_limit_trust_proxy:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take first IP from the list
            ip = forwarded.split(",")[0].strip()
            return f"ip:{ip}"

    # Fall back to direct connection IP
    return f"ip:{get_remote_address(request)}"


# Create rate limiter instance
limiter = Limiter(
    key_func=get_identifier,
    storage_uri=settings.redis_url if settings.rate_limit_storage == "redis" else "memory://",
    enabled=settings.rate_limit_enabled,
)


# Decorator factory for endpoints that have Request parameter
def rate_limit(limit_string: str) -> Callable[[Any], Any]:
    """
    Rate limit decorator for endpoints with Request parameter.

    Usage:
        @router.get("/endpoint")
        @rate_limit("10/minute")
        async def endpoint(request: Request, ...):
            ...
    """
    limit: Any = limiter.limit(limit_string)
    return limit  # type: ignore[no-any-return]


# Pre-configured limit strings
_auth_rpm = getattr(settings, "rate_limit_auth_requests_per_minute", 5)
AUTH_LIMIT = f"{_auth_rpm}/minute"  # Auth endpoints (configurable via RATE_LIMIT_AUTH_REQUESTS_PER_MINUTE)
API_LIMIT = f"{settings.rate_limit_requests_per_minute}/minute"  # Standard API
PUBLIC_LIMIT = "100/minute"  # Public/read-only endpoints
