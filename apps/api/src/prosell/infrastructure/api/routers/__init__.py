"""API routers for ProSell SaaS."""

from prosell.infrastructure.api.routers.auth_router import router as auth_router
from prosell.infrastructure.api.routers.category_router import router as category_router
from prosell.infrastructure.api.routers.dealer_router import router as dealer_router
from prosell.infrastructure.api.routers.facebook_router import router as facebook_router
from prosell.infrastructure.api.routers.health_router import router as health_router
from prosell.infrastructure.api.routers.org_router import router as org_router
from prosell.infrastructure.api.routers.product_router import router as product_router
from prosell.infrastructure.api.routers.publisher_router import router as publisher_router
from prosell.infrastructure.api.routers.team_router import router as team_router
from prosell.infrastructure.api.routers.user_dealer_router import router as user_dealer_router
from prosell.infrastructure.api.routers.vehicle_router import router as vehicle_router
from prosell.infrastructure.api.routers.wallet_router import router as wallet_router

__all__ = [
    "auth_router",
    "category_router",
    "dealer_router",
    "facebook_router",
    "health_router",
    "org_router",
    "product_router",
    "publisher_router",
    "team_router",
    "user_dealer_router",
    "vehicle_router",
    "wallet_router",
]
