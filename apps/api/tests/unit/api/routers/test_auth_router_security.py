"""Security regressions for authentication routes."""

from fastapi.routing import APIRoute

from prosell.infrastructure.api.routers.auth_router import router


def test_direct_oauth_login_endpoint_is_not_registered() -> None:
    """Client-supplied OAuth identities must never authenticate directly."""
    direct_login_routes = [
        route
        for route in router.routes
        if isinstance(route, APIRoute)
        and route.path == "/oauth/{provider}"
        and "POST" in route.methods
    ]

    assert direct_login_routes == []
