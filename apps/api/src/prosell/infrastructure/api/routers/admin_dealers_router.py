"""Admin dealer endpoints — Subsystem D Phase 4.

Lets a caller with `Permission.DEALER_ADMIN_VIEW_ALL` browse every dealer
organization and drill into a specific dealer's product catalog,
mirroring the cross-tenant bypass already wired into `product_router.py`.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.org.response import OrganizationListResponse, OrganizationResponse
from prosell.application.dto.organization.create_dealer import (
    CreateDealerRequest,
    CreateDealerResponse,
)
from prosell.application.use_cases.organization.create_dealer_organization import (
    CreateDealerOrganizationUseCase,
)
from prosell.application.use_cases.organization.invite_dealer_owner import (
    InviteDealerOwnerUseCase,
)
from prosell.application.use_cases.product.list_products import (
    ListProductsUseCase,
    ProductListResponse,
)
from prosell.domain.entities.role import Permission
from prosell.domain.entities.user import User
from prosell.domain.repositories.organization_invitation_repository import (
    AbstractOrganizationInvitationRepository,
)
from prosell.infrastructure.api.dependencies import (
    get_create_dealer_organization_use_case,
    get_current_auth_user_from_cookie,
    get_invite_dealer_owner_use_case,
    get_organization_invitation_repository,
)
from prosell.infrastructure.api.middleware.rate_limit_middleware import smart_rate_limit
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
    # Pass the verified dealer's own tenant_id (not None) so isolation never
    # relies solely on organization_id — a product whose organization_id was
    # mis-set to this dealer but whose tenant_id points elsewhere must not
    # leak through this admin endpoint.
    return await use_case.execute(tenant_id=dealer.tenant_id, organization_id=dealer_id)


@router.post("", response_model=CreateDealerResponse, status_code=status.HTTP_201_CREATED)
@smart_rate_limit("auth")
async def create_dealer(
    request: Request,
    create_request: CreateDealerRequest,
    current_user: CurrentUser,
    use_case: Annotated[
        CreateDealerOrganizationUseCase, Depends(get_create_dealer_organization_use_case)
    ],
) -> CreateDealerResponse:
    """Create a new dealer org + enable its verticals + invite its owner.

    Requires DEALER_ADMIN_VIEW_ALL (same gate as every other admin/dealers
    endpoint -- ORG_CREATE is the wrong permission here: it's
    SUPER_ADMIN-only, this also needs to work for ADMIN staff).

    No explicit transaction wrapping here -- `get_async_session` already
    commits once at the end of the request and rolls back the whole session
    on any unhandled exception (every repo call below uses `.flush()`, never
    `.commit()`), so a mid-flow failure (e.g. email delivery) already rolls
    back the org + vertical rows for free. See
    test_create_dealer_organization_atomicity.py.
    """
    _ = request
    _require_dealer_admin_view_all(current_user)

    try:
        invitation = await use_case.execute(
            name=create_request.name,
            vertical_ids=create_request.vertical_ids,
            owner_email=create_request.owner_email,
            inviter_name=current_user.full_name or current_user.email,
            created_by_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    return CreateDealerResponse(
        invitation_id=invitation.id,
        organization_id=invitation.organization_id,
        email=invitation.email,
        status=invitation.status.value,
    )


@router.post(
    "/{dealer_id}/resend-invitation",
    response_model=CreateDealerResponse,
    status_code=status.HTTP_200_OK,
)
@smart_rate_limit("auth")
async def resend_dealer_invitation(
    request: Request,
    dealer_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    invitation_repo: Annotated[
        AbstractOrganizationInvitationRepository, Depends(get_organization_invitation_repository)
    ],
    use_case: Annotated[InviteDealerOwnerUseCase, Depends(get_invite_dealer_owner_use_case)],
) -> CreateDealerResponse:
    """Resend (or freshly issue) the owner invitation for an existing dealer org."""
    _ = request
    _require_dealer_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    dealer = await org_repo.get_by_id(dealer_id, tenant_id=dealer_id)
    if dealer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    latest = await invitation_repo.get_latest_by_organization(dealer.id, dealer.tenant_id)
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No invitation exists yet for this dealer",
        )

    invitation = await use_case.execute(
        organization_id=dealer.id,
        organization_name=dealer.name,
        email=latest.email,
        tenant_id=dealer.tenant_id,
        inviter_name=current_user.full_name or current_user.email,
        created_by_user_id=current_user.id,
    )

    return CreateDealerResponse(
        invitation_id=invitation.id,
        organization_id=invitation.organization_id,
        email=invitation.email,
        status=invitation.status.value,
    )
