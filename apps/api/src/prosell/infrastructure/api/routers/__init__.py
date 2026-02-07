"""API routers for ProSell SaaS."""

from prosell.infrastructure.api.routers.auth_router import router as auth_router

__all__ = [
    "auth_router",
]
