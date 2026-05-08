"""Admin router for ProSell SaaS API."""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.organization import Organization
from prosell.domain.entities.product import Product
from prosell.domain.entities.publication import Publication
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import require_role
from prosell.infrastructure.database.session import get_async_session

router = APIRouter(tags=["Admin"])


@router.get(
    "/stats",
    summary="Get admin dashboard statistics",
)
async def get_admin_stats(
    _admin: dict = Depends(require_role(RoleType.SUPER_ADMIN)),
    session: AsyncSession = Depends(get_async_session),
) -> JSONResponse:
    """
    Get system-wide statistics for the admin dashboard.

    Returns counts for:
    - Total organizations
    - Total products (includes vehicles)
    - Total users
    - Total publications

    Access: SUPER_ADMIN only
    """
    # Query all counts in a single round-trip using multiple select statements
    result = await session.execute(
        select(
            func.count(Organization.id),
            func.count(Product.id),
            func.count(User.id),
            func.count(Publication.id),
        )
    )

    counts = result.one()
    total_organizations, total_products, total_users, total_publications = counts

    return JSONResponse(
        content={
            "total_organizations": total_organizations,
            "total_products": total_products,
            "total_users": total_users,
            "total_publications": total_publications,
        }
    )
