"""Rate limiting middleware using slowapi for FastAPI."""

import inspect
import re
from collections.abc import Callable
from functools import wraps
from typing import Any

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from prosell.core.config import settings


def is_test_environment() -> bool:
    """Check if current environment is a testing environment."""
    return settings.environment in ["testing", "test"]


def is_rate_limit_exempt(request: Request) -> bool:
    """
    Check if request should be exempt from rate limiting.

    Testing exemptions:
    - Test environment specific
    - Special test user agents
    - Configured exempt IP ranges
    - Test API keys
    """
    if not is_test_environment():
        return False

    # Check for test user agent
    user_agent = request.headers.get("User-Agent", "")
    if "test" in user_agent.lower() or "playwright" in user_agent.lower():
        return True

    # Check for test API key in headers
    test_api_key = request.headers.get("X-Test-API-Key")
    if test_api_key and test_api_key == getattr(settings, "test_api_key", ""):
        return True

    # Check exempt IP ranges
    client_ip = get_identifier(request)
    exempt_ips = getattr(settings, "rate_limit_exempt_ips", [])
    exempt_ranges = getattr(settings, "rate_limit_exempt_ranges", [])

    # Check exact IP match
    if client_ip in [f"ip:{ip}" for ip in exempt_ips]:
        return True

    # Check IP ranges (e.g., 192.168.1.0/24)
    for ip_range in exempt_ranges:
        try:
            network_pattern = ip_range.replace(".", "\\.").replace("*", "\\d+")
            if re.match(f"^{network_pattern}$", client_ip.split(":")[1]):
                return True
        except (ValueError, IndexError):
            continue

    return False


def get_identifier(request: Request) -> str:
    """
    Get rate limit identifier from request.

    Priority:
    1. User ID from JWT (if authenticated)
    2. IP address from X-Forwarded-For (if trusted proxy)
    3. IP address from direct connection
    """
    # Exempt test requests from rate limiting in test environment
    if is_test_environment() and is_rate_limit_exempt(request):
        return f"exempt:{get_remote_address(request)}"

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
    def decorator(func: Callable[[Any], Any]) -> Callable[[Any], Any]:
        original_signature = inspect.signature(func)

        def _extract_request(args: tuple[Any, ...], kwargs: dict[str, Any]) -> Request:
            bound_arguments = original_signature.bind_partial(*args, **kwargs)

            for value in bound_arguments.arguments.values():
                if isinstance(value, Request):
                    return value

            raise TypeError(
                f"Rate-limited endpoint '{func.__name__}' must receive a FastAPI Request argument"
            )

        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            request = _extract_request(args, kwargs)

            # Skip rate limiting for exempt requests in test environment
            if is_test_environment() and is_rate_limit_exempt(request):
                return await func(*args, **kwargs)

            # Apply normal rate limiting
            limit = limiter.limit(limit_string)
            return await limit(func)(*args, **kwargs)

        # Preserve the original endpoint signature so FastAPI doesn't try
        # to interpret *args/**kwargs as query parameters.
        wrapper.__signature__ = original_signature  # type: ignore[attr-defined]
        return wrapper
    return decorator


# Smart rate limit function that adjusts limits based on environment
def smart_rate_limit(
    endpoint_type: str = "api",
    custom_limit: str | None = None
) -> Callable[[Any], Any]:
    """
    Smart rate limit decorator that adjusts limits based on environment.

    Args:
        endpoint_type: Type of endpoint ("auth", "api", "public")
        custom_limit: Custom limit string (overrides default)
    """
    if is_test_environment():
        # Much higher limits for testing
        if endpoint_type == "auth":
            limit = custom_limit or "1000/minute"  # 1000 requests per minute for auth in testing
        elif endpoint_type == "api":
            limit = custom_limit or "500/minute"   # 500 requests per minute for API in testing
        else:  # public
            limit = custom_limit or "2000/minute"  # 2000 requests per minute for public in testing
    else:
        # Normal limits for production
        if endpoint_type == "auth":
            limit = custom_limit or AUTH_LIMIT
        elif endpoint_type == "api":
            limit = custom_limit or API_LIMIT
        else:  # public
            limit = custom_limit or PUBLIC_LIMIT

    return rate_limit(limit)


# Pre-configured limit strings
_auth_rpm = getattr(settings, "rate_limit_auth_requests_per_minute", 5)
AUTH_LIMIT = f"{_auth_rpm}/minute"  # Auth endpoints (configurable via RATE_LIMIT_AUTH_REQUESTS_PER_MINUTE)  # noqa: E501
API_LIMIT = f"{settings.rate_limit_requests_per_minute}/minute"  # Standard API
PUBLIC_LIMIT = "100/minute"  # Public/read-only endpoints
