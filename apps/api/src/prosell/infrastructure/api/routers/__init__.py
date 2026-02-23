"""API routers for ProSell SaaS."""

from prosell.infrastructure.api.routers.auth_router import router as auth_router
from prosell.infrastructure.api.routers.org_router import router as org_router
from prosell.infrastructure.api.routers.team_router import router as team_router
from prosell.infrastructure.api.routers.wallet_router import router as wallet_router

__all__ = [
    "auth_router",
    "org_router",
    "team_router",
    "wallet_router",
]
