"""Admin router for ProSell SaaS API."""

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.role import RoleType
from prosell.infrastructure.api.dependencies import require_role
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.models.publication_model import PublicationModel
from prosell.infrastructure.models.user_model import UserModel

router = APIRouter(tags=["Admin"])


@router.get(
    "/stats",
    summary="Get admin dashboard statistics",
)
async def get_admin_stats(
    _admin: dict[str, Any] = Depends(require_role(RoleType.SUPER_ADMIN)),
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
    # Count all organizations, products, users, and publications
    stmt_org = select(func.count()).select_from(OrganizationModel)
    stmt_prod = select(func.count()).select_from(ProductModel)
    stmt_user = select(func.count()).select_from(UserModel)
    stmt_pub = select(func.count()).select_from(PublicationModel)

    result_org = await session.execute(stmt_org)
    result_prod = await session.execute(stmt_prod)
    result_user = await session.execute(stmt_user)
    result_pub = await session.execute(stmt_pub)

    total_organizations = result_org.scalar()
    total_products = result_prod.scalar()
    total_users = result_user.scalar()
    total_publications = result_pub.scalar()

    return JSONResponse(
        content={
            "total_organizations": total_organizations,
            "total_products": total_products,
            "total_users": total_users,
            "total_publications": total_publications,
        }
    )
