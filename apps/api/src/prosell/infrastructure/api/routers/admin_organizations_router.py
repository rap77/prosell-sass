"""Admin organization endpoints — Subsystem D Phase 4.

Lets a caller with `Permission.ORG_ADMIN_VIEW_ALL` browse every organization
and drill into a specific organization's product catalog,
mirroring the cross-tenant bypass already wired into `product_router.py`.
"""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.org.response import OrganizationListResponse, OrganizationResponse
from prosell.application.dto.organization.create_organization import (
    CreateOrganizationRequest,
    CreateOrganizationResponse,
)
from prosell.application.use_cases.organization.create_organization import (
    CreateOrganizationUseCase,
)
from prosell.application.use_cases.organization.invite_organization_owner import (
    InviteOrganizationOwnerUseCase,
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
    get_create_organization_use_case,
    get_current_auth_user_from_cookie,
    get_invite_organization_owner_use_case,
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
from prosell.infrastructure.repositories.organization_vertical_repository_impl import (
    SqlAlchemyOrganizationVerticalRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)

router = APIRouter()

CurrentUser = Annotated[User, Depends(get_current_auth_user_from_cookie)]
DbSession = Annotated[AsyncSession, Depends(get_async_session)]


class UpdateOrganizationVerticalsRequest(BaseModel):
    vertical_ids: list[UUID]


class VerticalWithProductCount(BaseModel):
    vertical_id: UUID
    product_count: int


class OrganizationVerticalsResponse(BaseModel):
    organization_id: UUID
    vertical_ids: list[UUID]
    # ponytail: product_counts for UX — disable removal if > 0
    product_counts: list[VerticalWithProductCount]


def _require_org_admin_view_all(current_user: User) -> None:
    if not current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission 'org:admin_view_all' required",
        )


@router.get("", response_model=OrganizationListResponse)
async def list_organizations(current_user: CurrentUser, db: DbSession) -> OrganizationListResponse:
    """List every organization organization. Requires ORG_ADMIN_VIEW_ALL."""
    _require_org_admin_view_all(current_user)

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


@router.get("/{organization_id}/products", response_model=ProductListResponse)
async def list_organization_products(
    organization_id: UUID, current_user: CurrentUser, db: DbSession
) -> ProductListResponse:
    """List a specific organization's products. Requires ORG_ADMIN_VIEW_ALL."""
    _require_org_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    # `organization_id` and `tenant_id` are the same value by design (see
    # `AbstractOrganizationRepository.get_by_tenant_id` docstring) — this is
    # an existence lookup, not a cross-tenant bypass, since the caller is
    # already gated by ORG_ADMIN_VIEW_ALL above.
    organization = await org_repo.get_by_id(organization_id, tenant_id=organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    product_repo = SqlAlchemyProductRepository(db)
    use_case = ListProductsUseCase(product_repo)
    # Pass the verified organization's own tenant_id (not None) so isolation never
    # relies solely on organization_id — a product whose organization_id was
    # mis-set to this organization but whose tenant_id points elsewhere must not
    # leak through this admin endpoint.
    return await use_case.execute(tenant_id=organization.tenant_id, organization_id=organization_id)


@router.post("", response_model=CreateOrganizationResponse, status_code=status.HTTP_201_CREATED)
@smart_rate_limit("auth")
async def create_organization(
    request: Request,
    create_request: CreateOrganizationRequest,
    current_user: CurrentUser,
    db: DbSession,
    use_case: Annotated[CreateOrganizationUseCase, Depends(get_create_organization_use_case)],
) -> CreateOrganizationResponse:
    """Create a new organization org + enable its verticals + invite its owner.

    Requires ORG_ADMIN_VIEW_ALL (same gate as every other admin/organizations
    endpoint -- ORG_CREATE is the wrong permission here: it's
    SUPER_ADMIN-only, this also needs to work for ADMIN staff).

    No explicit transaction wrapping here -- `get_async_session` already
    commits once at the end of the request and rolls back the whole session
    on any unhandled exception (every repo call below uses `.flush()`, never
    `.commit()`), so a mid-flow failure (e.g. email delivery) already rolls
    back the org + vertical rows for free. See
    test_create_organization_atomicity.py.
    """
    _ = request
    _require_org_admin_view_all(current_user)

    try:
        result = await use_case.execute(
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
                organization_id=result.organization.id,
                name=broker.name,
                email=broker.email,
                phone=broker.phone,
                status="pending",
            )

    return CreateOrganizationResponse(
        organization_id=result.organization.id,
        invitation_id=result.invitation.id if result.invitation else None,
        email=result.invitation.email if result.invitation else None,
        status=result.invitation.status.value if result.invitation else None,
    )


@router.post(
    "/{organization_id}/resend-invitation",
    response_model=CreateOrganizationResponse,
    status_code=status.HTTP_200_OK,
)
@smart_rate_limit("auth")
async def resend_organization_invitation(
    request: Request,
    organization_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    invitation_repo: Annotated[
        AbstractOrganizationInvitationRepository, Depends(get_organization_invitation_repository)
    ],
    use_case: Annotated[
        InviteOrganizationOwnerUseCase, Depends(get_invite_organization_owner_use_case)
    ],
) -> CreateOrganizationResponse:
    """Resend (or freshly issue) the owner invitation for an existing organization org."""
    _ = request
    _require_org_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    organization = await org_repo.get_by_id(organization_id, tenant_id=organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # CR-1 server-side gate: the UI hides the resend button on non-pending
    # organizations, but a scripted caller (or an admin on a stale dashboard) can
    # still POST. Without this gate, the use case would silently issue a
    # brand-new pending invitation to a historical email -- operationally
    # confusing and a vector for impersonation phish. 409 is the right code:
    # the request is well-formed, it just conflicts with the resource's
    # current state. The check lives here (not in InviteOrganizationOwnerUseCase)
    # because that use case is also called from CreateOrganizationUseCase
    # for brand-new organizations, which are always pending and must not gate.
    if organization.status != OrganizationStatus.PENDING_VERIFICATION.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization is not pending verification; resend only valid for pending organizations",  # noqa: E501
        )

    latest = await invitation_repo.get_latest_by_organization(
        organization.id, organization.tenant_id
    )
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No invitation exists yet for this organization",
        )

    invitation = await use_case.execute(
        organization_id=organization.id,
        organization_name=organization.name,
        email=latest.email,
        tenant_id=organization.tenant_id,
        inviter_name=current_user.full_name or current_user.email,
        created_by_user_id=current_user.id,
    )

    return CreateOrganizationResponse(
        invitation_id=invitation.id,
        organization_id=invitation.organization_id,
        email=invitation.email,
        status=invitation.status.value,
    )


# -----------------------------------------------------------------------------
# Update organization
# -----------------------------------------------------------------------------


class UpdateOrganizationRequest(BaseModel):
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


class UpdateOrganizationResponse(BaseModel):
    id: UUID
    name: str
    status: str


@router.patch("/{organization_id}", response_model=UpdateOrganizationResponse)
async def update_organization(
    organization_id: UUID,
    request: UpdateOrganizationRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> UpdateOrganizationResponse:
    """Update a organization's details."""
    _require_org_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    organization = await org_repo.get_by_id(organization_id, tenant_id=organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # ponytail: direct assignment, entity handles validation
    if request.name is not None:
        organization.name = request.name
    if request.code is not None:
        organization.code = request.code
    if request.color is not None:
        organization.color = request.color
    if request.description is not None:
        organization.description = request.description
    if request.website is not None:
        organization.website = request.website
    if request.phone is not None:
        organization.phone = request.phone
    if request.email is not None:
        organization.email = request.email
    if request.whatsapp is not None:
        organization.whatsapp = request.whatsapp
    if request.street_address is not None:
        organization.street_address = request.street_address
    if request.city is not None:
        organization.city = request.city
    if request.state is not None:
        organization.state = request.state
    if request.postal_code is not None:
        organization.postal_code = request.postal_code
    if request.country is not None:
        organization.country = request.country
    if request.tax_id is not None:
        organization.tax_id = request.tax_id
    if request.instagram is not None:
        organization.instagram = request.instagram
    if request.facebook is not None:
        organization.facebook = request.facebook

    updated = await org_repo.update(organization)
    return UpdateOrganizationResponse(id=updated.id, name=updated.name, status=updated.status)


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


@router.get("/{organization_id}/brokers", response_model=BrokerListResponse)
async def list_organization_brokers(
    organization_id: UUID, current_user: CurrentUser, db: DbSession
) -> BrokerListResponse:
    """List brokers for a organization. Requires ORG_ADMIN_VIEW_ALL."""
    _require_org_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    organization = await org_repo.get_by_id(organization_id, tenant_id=organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    broker_repo = SqlAlchemyOrganizationBrokerRepository(db)
    brokers = await broker_repo.list_brokers(organization_id)

    return BrokerListResponse(
        brokers=[BrokerResponse.from_info(b) for b in brokers],
        count=len(brokers),
    )


@router.post(
    "/{organization_id}/brokers", response_model=BrokerResponse, status_code=status.HTTP_201_CREATED
)
async def create_organization_broker(
    organization_id: UUID,
    request: CreateBrokerRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> BrokerResponse:
    """Create a broker for a organization. Requires ORG_ADMIN_VIEW_ALL.

    Brokers start as 'pending' and can be linked to users later.
    """
    _require_org_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    organization = await org_repo.get_by_id(organization_id, tenant_id=organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    broker_repo = SqlAlchemyOrganizationBrokerRepository(db)

    # Check if broker with this email already exists
    existing = await broker_repo.get_by_email(organization_id, request.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A broker with this email already exists for this organization",
        )

    broker = await broker_repo.create_broker(
        organization_id=organization_id,
        name=request.name,
        email=request.email,
        phone=request.phone,
        status="pending",
    )

    return BrokerResponse.from_info(broker)


@router.patch("/{organization_id}/brokers/{broker_id}", response_model=BrokerResponse)
async def update_organization_broker(
    organization_id: UUID,
    broker_id: UUID,
    request: UpdateBrokerRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> BrokerResponse:
    """Update a broker. Only allowed if status is 'pending'."""
    _require_org_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    organization = await org_repo.get_by_id(organization_id, tenant_id=organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    broker_repo = SqlAlchemyOrganizationBrokerRepository(db)

    try:
        broker = await broker_repo.update_broker(
            broker_id=broker_id,
            organization_id=organization_id,
            name=request.name,
            email=request.email,
            phone=request.phone,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    if broker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broker not found")

    return BrokerResponse.from_info(broker)


@router.delete(
    "/{organization_id}/brokers/{broker_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_organization_broker(
    organization_id: UUID,
    broker_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Delete a broker. Requires ORG_ADMIN_VIEW_ALL."""
    _require_org_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    organization = await org_repo.get_by_id(organization_id, tenant_id=organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    broker_repo = SqlAlchemyOrganizationBrokerRepository(db)
    deleted = await broker_repo.delete_broker(broker_id, organization_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broker not found")


async def _count_products_per_vertical(
    db: AsyncSession, organization_id: UUID, tenant_id: UUID
) -> dict[UUID, int]:
    """Count products per root category (vertical) using recursive CTE.

    Defense in depth: filters products by both `organization_id` (the
    organization being managed) and `tenant_id` (the requester's tenant)
    so cross-tenant data can never influence the count.
    """
    # ponytail: recursive CTE traces each product's category up to root (level=0)
    query = text("""
        WITH RECURSIVE category_tree AS (
            SELECT c.id as leaf_id, c.id as current_id, c.parent_id, c.level
            FROM categories c
            WHERE c.id IN (
                SELECT DISTINCT category_id
                FROM products
                WHERE organization_id = :org_id AND tenant_id = :tenant_id
            )

            UNION ALL

            SELECT ct.leaf_id, parent.id, parent.parent_id, parent.level
            FROM category_tree ct
            JOIN categories parent ON ct.parent_id = parent.id
        )
        SELECT ct.current_id as root_id, COUNT(*) as cnt
        FROM category_tree ct
        JOIN products p
            ON p.category_id = ct.leaf_id
            AND p.organization_id = :org_id
            AND p.tenant_id = :tenant_id
        WHERE ct.level = 0
        GROUP BY ct.current_id
    """)
    result = await db.execute(query, {"org_id": organization_id, "tenant_id": tenant_id})
    return {row.root_id: row.cnt for row in result.fetchall()}


@router.get("/{organization_id}/verticals", response_model=OrganizationVerticalsResponse)
async def get_organization_verticals(
    organization_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> OrganizationVerticalsResponse:
    """Get an organization's verticals with product counts. Requires ORG_ADMIN_VIEW_ALL."""
    _require_org_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    organization = await org_repo.get_by_id(organization_id, tenant_id=organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    vertical_repo = SqlAlchemyOrganizationVerticalRepository(db)
    vertical_ids = await vertical_repo.list_root_category_ids(organization_id)

    # Get product counts per vertical
    product_counts = await _count_products_per_vertical(db, organization_id, organization.tenant_id)

    return OrganizationVerticalsResponse(
        organization_id=organization_id,
        vertical_ids=vertical_ids,
        product_counts=[
            VerticalWithProductCount(vertical_id=vid, product_count=product_counts.get(vid, 0))
            for vid in vertical_ids
        ],
    )


@router.patch("/{organization_id}/verticals", response_model=OrganizationVerticalsResponse)
async def update_organization_verticals(
    organization_id: UUID,
    request: UpdateOrganizationVerticalsRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> OrganizationVerticalsResponse:
    """Update an organization's verticals. Requires ORG_ADMIN_VIEW_ALL."""
    _require_org_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    organization = await org_repo.get_by_id(organization_id, tenant_id=organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    vertical_repo = SqlAlchemyOrganizationVerticalRepository(db)

    # Get current verticals and product counts
    current_vertical_ids = await vertical_repo.list_root_category_ids(organization_id)
    product_counts = await _count_products_per_vertical(db, organization_id, organization.tenant_id)

    # Validate: cannot remove verticals with products
    verticals_to_remove = [v for v in current_vertical_ids if v not in request.vertical_ids]
    blocked = [v for v in verticals_to_remove if product_counts.get(v, 0) > 0]
    if blocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot remove verticals with products: {[str(v) for v in blocked]}",
        )

    # Remove verticals that are no longer selected
    for vertical_id in verticals_to_remove:
        await vertical_repo.disable(organization_id, vertical_id)

    # Add new verticals
    for vertical_id in request.vertical_ids:
        if vertical_id not in current_vertical_ids:
            await vertical_repo.enable(organization_id, vertical_id)

    return OrganizationVerticalsResponse(
        organization_id=organization_id,
        vertical_ids=request.vertical_ids,
        product_counts=[
            VerticalWithProductCount(vertical_id=vid, product_count=product_counts.get(vid, 0))
            for vid in request.vertical_ids
        ],
    )
