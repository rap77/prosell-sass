"""Admin dealer endpoints — Subsystem D Phase 4.

Lets a caller with `Permission.DEALER_ADMIN_VIEW_ALL` browse every dealer
organization and drill into a specific dealer's product catalog,
mirroring the cross-tenant bypass already wired into `product_router.py`.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.org.response import OrganizationListResponse, OrganizationResponse
from prosell.application.use_cases.product.list_products import (
    ListProductsUseCase,
    ProductListResponse,
)
from prosell.domain.entities.role import Permission
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.organization_repository_impl import (
    SqlAlchemyOrganizationRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)

router = APIRouter()

CurrentUser = Annotated[User, Depends(get_current_auth_user_from_cookie)]
DbSession = Annotated[AsyncSession, Depends(get_async_session)]


def _require_dealer_admin_view_all(current_user: User) -> None:
    if not current_user.has_permission(Permission.DEALER_ADMIN_VIEW_ALL):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission 'dealer:admin_view_all' required",
        )


@router.get("", response_model=OrganizationListResponse)
async def list_dealers(current_user: CurrentUser, db: DbSession) -> OrganizationListResponse:
    """List every dealer organization. Requires DEALER_ADMIN_VIEW_ALL."""
    _require_dealer_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    # No skip/limit on this endpoint — it always returns every dealer, so
    # `total` is just the fetched count. A separate count() round trip
    # would be redundant (was previously a second DB query for the same
    # number).
    organizations = await org_repo.get_all(tenant_id=None)

    return OrganizationListResponse(
        organizations=[OrganizationResponse.from_entity(org) for org in organizations],
        total=len(organizations),
        skip=0,
        limit=len(organizations),
    )


@router.get("/{dealer_id}/products", response_model=ProductListResponse)
async def list_dealer_products(
    dealer_id: UUID, current_user: CurrentUser, db: DbSession
) -> ProductListResponse:
    """List a specific dealer's products. Requires DEALER_ADMIN_VIEW_ALL."""
    _require_dealer_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    # `dealer_id` and `tenant_id` are the same value by design (see
    # `AbstractOrganizationRepository.get_by_tenant_id` docstring) — this is
    # an existence lookup, not a cross-tenant bypass, since the caller is
    # already gated by DEALER_ADMIN_VIEW_ALL above.
    dealer = await org_repo.get_by_id(dealer_id, tenant_id=dealer_id)
    if dealer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    product_repo = SqlAlchemyProductRepository(db)
    use_case = ListProductsUseCase(product_repo)
    return await use_case.execute(tenant_id=None, organization_id=dealer_id)
