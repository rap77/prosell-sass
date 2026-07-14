"""Admin dealer endpoints — Subsystem D Phase 4.

Lets a caller with `Permission.DEALER_ADMIN_VIEW_ALL` browse every dealer
organization and drill into a specific dealer's product catalog,
mirroring the cross-tenant bypass already wired into `product_router.py`.
"""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
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
from prosell.domain.value_objects.organization_status import OrganizationStatus
from prosell.infrastructure.api.dependencies import (
    get_create_dealer_organization_use_case,
    get_current_auth_user_from_cookie,
    get_invite_dealer_owner_use_case,
    get_organization_invitation_repository,
)
from prosell.infrastructure.api.middleware.rate_limit_middleware import smart_rate_limit
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.organization_broker_repository_impl import (
    BrokerInfo,
    SqlAlchemyOrganizationBrokerRepository,
)
from prosell.infrastructure.repositories.organization_invitation_repository_impl import (
    SqlAlchemyOrganizationInvitationRepository,
)
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
    broker_repo = SqlAlchemyOrganizationBrokerRepository(db)
    invitation_repo = SqlAlchemyOrganizationInvitationRepository(db)
    organizations = await org_repo.get_all(tenant_id=None)

    # ponytail: N+1 is fine for admin dashboard with ~50 orgs max
    responses = []
    for org in organizations:
        count = await broker_repo.count_brokers(org.id)
        invitation = await invitation_repo.get_latest_by_organization(org.id, org.tenant_id)
        responses.append(
            OrganizationResponse.from_entity(
                org,
                broker_count=count,
                owner_email=invitation.email if invitation else None,
            )
        )

    return OrganizationListResponse(
        organizations=responses,
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
    db: DbSession,
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

    # Add brokers if provided
    if create_request.brokers:
        broker_repo = SqlAlchemyOrganizationBrokerRepository(db)
        for broker in create_request.brokers:
            await broker_repo.create_broker(
                organization_id=invitation.organization_id,
                name=broker.name,
                email=broker.email,
                phone=broker.phone,
                status="pending",
            )

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

    # CR-1 server-side gate: the UI hides the resend button on non-pending
    # dealers, but a scripted caller (or an admin on a stale dashboard) can
    # still POST. Without this gate, the use case would silently issue a
    # brand-new pending invitation to a historical email -- operationally
    # confusing and a vector for impersonation phish. 409 is the right code:
    # the request is well-formed, it just conflicts with the resource's
    # current state. The check lives here (not in InviteDealerOwnerUseCase)
    # because that use case is also called from CreateDealerOrganizationUseCase
    # for brand-new dealers, which are always pending and must not gate.
    if dealer.status != OrganizationStatus.PENDING_VERIFICATION.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Dealer is not pending verification; resend only valid for pending dealers",
        )

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


# -----------------------------------------------------------------------------
# Update dealer
# -----------------------------------------------------------------------------


class UpdateDealerRequest(BaseModel):
    name: str | None = None
    code: str | None = None
    color: str | None = None
    description: str | None = None
    website: str | None = None
    phone: str | None = None
    email: str | None = None
    whatsapp: str | None = None
    street_address: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    tax_id: str | None = None
    instagram: str | None = None
    facebook: str | None = None


class UpdateDealerResponse(BaseModel):
    id: UUID
    name: str
    status: str


@router.patch("/{dealer_id}", response_model=UpdateDealerResponse)
async def update_dealer(
    dealer_id: UUID,
    request: UpdateDealerRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> UpdateDealerResponse:
    """Update a dealer's details."""
    _require_dealer_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    dealer = await org_repo.get_by_id(dealer_id, tenant_id=dealer_id)
    if dealer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    # ponytail: direct assignment, entity handles validation
    if request.name is not None:
        dealer.name = request.name
    if request.code is not None:
        dealer.code = request.code
    if request.color is not None:
        dealer.color = request.color
    if request.description is not None:
        dealer.description = request.description
    if request.website is not None:
        dealer.website = request.website
    if request.phone is not None:
        dealer.phone = request.phone
    if request.email is not None:
        dealer.email = request.email
    if request.whatsapp is not None:
        dealer.whatsapp = request.whatsapp
    if request.street_address is not None:
        dealer.street_address = request.street_address
    if request.city is not None:
        dealer.city = request.city
    if request.state is not None:
        dealer.state = request.state
    if request.postal_code is not None:
        dealer.postal_code = request.postal_code
    if request.country is not None:
        dealer.country = request.country
    if request.tax_id is not None:
        dealer.tax_id = request.tax_id
    if request.instagram is not None:
        dealer.instagram = request.instagram
    if request.facebook is not None:
        dealer.facebook = request.facebook

    updated = await org_repo.update(dealer)
    return UpdateDealerResponse(id=updated.id, name=updated.name, status=updated.status)


# -----------------------------------------------------------------------------
# Broker CRUD
# -----------------------------------------------------------------------------


class BrokerResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: str | None
    user_id: UUID | None
    status: str  # pending | verified
    created_at: datetime
    verified_at: datetime | None

    @classmethod
    def from_info(cls, broker: BrokerInfo) -> "BrokerResponse":
        return cls(
            id=broker.id,
            name=broker.name,
            email=broker.email,
            phone=broker.phone,
            user_id=broker.user_id,
            status=broker.status,
            created_at=broker.created_at,
            verified_at=broker.verified_at,
        )


class BrokerListResponse(BaseModel):
    brokers: list[BrokerResponse]
    count: int


class CreateBrokerRequest(BaseModel):
    name: str
    email: str
    phone: str | None = None


class UpdateBrokerRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None


@router.get("/{dealer_id}/brokers", response_model=BrokerListResponse)
async def list_dealer_brokers(
    dealer_id: UUID, current_user: CurrentUser, db: DbSession
) -> BrokerListResponse:
    """List brokers for a dealer. Requires DEALER_ADMIN_VIEW_ALL."""
    _require_dealer_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    dealer = await org_repo.get_by_id(dealer_id, tenant_id=dealer_id)
    if dealer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    broker_repo = SqlAlchemyOrganizationBrokerRepository(db)
    brokers = await broker_repo.list_brokers(dealer_id)

    return BrokerListResponse(
        brokers=[BrokerResponse.from_info(b) for b in brokers],
        count=len(brokers),
    )


@router.post(
    "/{dealer_id}/brokers", response_model=BrokerResponse, status_code=status.HTTP_201_CREATED
)
async def create_dealer_broker(
    dealer_id: UUID,
    request: CreateBrokerRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> BrokerResponse:
    """Create a broker for a dealer. Requires DEALER_ADMIN_VIEW_ALL.

    Brokers start as 'pending' and can be linked to users later.
    """
    _require_dealer_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    dealer = await org_repo.get_by_id(dealer_id, tenant_id=dealer_id)
    if dealer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    broker_repo = SqlAlchemyOrganizationBrokerRepository(db)

    # Check if broker with this email already exists
    existing = await broker_repo.get_by_email(dealer_id, request.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A broker with this email already exists for this organization",
        )

    broker = await broker_repo.create_broker(
        organization_id=dealer_id,
        name=request.name,
        email=request.email,
        phone=request.phone,
        status="pending",
    )

    return BrokerResponse.from_info(broker)


@router.patch("/{dealer_id}/brokers/{broker_id}", response_model=BrokerResponse)
async def update_dealer_broker(
    dealer_id: UUID,
    broker_id: UUID,
    request: UpdateBrokerRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> BrokerResponse:
    """Update a broker. Only allowed if status is 'pending'."""
    _require_dealer_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    dealer = await org_repo.get_by_id(dealer_id, tenant_id=dealer_id)
    if dealer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    broker_repo = SqlAlchemyOrganizationBrokerRepository(db)

    try:
        broker = await broker_repo.update_broker(
            broker_id=broker_id,
            name=request.name,
            email=request.email,
            phone=request.phone,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    if broker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broker not found")

    return BrokerResponse.from_info(broker)


@router.delete("/{dealer_id}/brokers/{broker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dealer_broker(
    dealer_id: UUID,
    broker_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Delete a broker. Requires DEALER_ADMIN_VIEW_ALL."""
    _require_dealer_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    dealer = await org_repo.get_by_id(dealer_id, tenant_id=dealer_id)
    if dealer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    broker_repo = SqlAlchemyOrganizationBrokerRepository(db)
    deleted = await broker_repo.delete_broker(broker_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broker not found")
