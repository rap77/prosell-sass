"""Marketplace access router - cross-org authorization API."""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.marketplace_access import (
    AccessGrantResponse,
    CreateAccessAsAdminRequest,
    RejectRequest,
    RequestAccessRequest,
    RevokeRequest,
)
from prosell.domain.entities.marketplace_access import MarketplaceAccessGrant
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.marketplace_access_repository_impl import (
    SqlAlchemyMarketplaceAccessRepository,
)

router = APIRouter(prefix="/marketplace-access", tags=["marketplace-access"])

DbSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[User, Depends(get_current_auth_user_from_cookie)]


def _entity_to_dto(entity: MarketplaceAccessGrant) -> AccessGrantResponse:
    """Convert domain entity to DTO response."""
    return AccessGrantResponse(
        id=entity.id,
        inventory_owner_organization_id=entity.inventory_owner_organization_id,
        operator_organization_id=entity.operator_organization_id,
        status=entity.status.value,
        can_publish_marketplace=entity.can_publish_marketplace,
        can_manage_inventory=entity.can_manage_inventory,
        requested_by_user_id=entity.requested_by_user_id,
        approved_by_user_id=entity.approved_by_user_id,
        rejected_by_user_id=entity.rejected_by_user_id,
        revoked_by_user_id=entity.revoked_by_user_id,
        requested_at=entity.requested_at,
        approved_at=entity.approved_at,
        rejected_at=entity.rejected_at,
        revoked_at=entity.revoked_at,
        rejection_reason=entity.rejection_reason,
        revocation_reason=entity.revocation_reason,
    )


@router.post("/request", response_model=AccessGrantResponse, status_code=status.HTTP_201_CREATED)
async def request_access(
    request: RequestAccessRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AccessGrantResponse:
    """Request marketplace operator access for your organization's inventory."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    repo = SqlAlchemyMarketplaceAccessRepository(db)

    # Check if already exists
    existing = await repo.get_by_orgs(current_user.tenant_id, request.operator_organization_id)
    if existing and existing.is_pending:
        return _entity_to_dto(existing)

    # Create new pending request using domain factory
    grant = MarketplaceAccessGrant.create(
        id=uuid4(),
        inventory_owner_organization_id=current_user.tenant_id,
        operator_organization_id=request.operator_organization_id,
        requested_by_user_id=current_user.id,
        can_publish_marketplace=request.can_publish_marketplace,
        can_manage_inventory=request.can_manage_inventory,
    )

    created = await repo.create(grant)
    await db.commit()

    return _entity_to_dto(created)


@router.post(
    "/create-as-admin",
    response_model=AccessGrantResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_access_as_admin(
    request: CreateAccessAsAdminRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AccessGrantResponse:
    """Create marketplace access grant as admin (bypass REQUEST flow).

    Allows ProSell admin to create grants directly without waiting for dealer request.
    Can create grants in 'pending' or 'active' status.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    # Verify current user is admin of operator organization
    if request.operator_organization_id != current_user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Can only create grants for your own organization",
        )

    # TODO: Add admin role check when roles are implemented
    # if not current_user.has_role("admin"):
    #     raise HTTPException(status_code=403, detail="Admin role required")

    repo = SqlAlchemyMarketplaceAccessRepository(db)

    # Check if grant already exists
    existing = await repo.get_by_orgs(
        request.inventory_owner_organization_id, request.operator_organization_id
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Grant already exists with status: {existing.status.value}",
        )

    # Create grant entity
    grant = MarketplaceAccessGrant.create(
        id=uuid4(),
        inventory_owner_organization_id=request.inventory_owner_organization_id,
        operator_organization_id=request.operator_organization_id,
        requested_by_user_id=current_user.id,
        can_publish_marketplace=request.can_publish_marketplace,
        can_manage_inventory=request.can_manage_inventory,
    )

    # If initial_status is active, approve it immediately
    if request.initial_status == "active":
        grant.approve(approver_id=current_user.id)

    created = await repo.create(grant)
    await db.commit()

    return _entity_to_dto(created)


@router.get("/requests", response_model=list[AccessGrantResponse])
async def list_requests(
    current_user: CurrentUser,
    db: DbSession,
) -> list[AccessGrantResponse]:
    """List all grants visible to current user's organization."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    repo = SqlAlchemyMarketplaceAccessRepository(db)

    # ponytail: show grants where user's org is inventory owner OR operator
    as_owner = await repo.list_by_inventory_owner(current_user.tenant_id)
    as_operator = await repo.list_by_operator(current_user.tenant_id)

    # Combine and dedupe
    seen = set()
    grants = []
    for grant in as_owner + as_operator:
        if grant.id not in seen:
            seen.add(grant.id)
            grants.append(_entity_to_dto(grant))

    return grants


@router.post("/{grant_id}/approve", response_model=AccessGrantResponse)
async def approve_request(
    grant_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> AccessGrantResponse:
    """Approve a pending marketplace access request (operator only)."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    repo = SqlAlchemyMarketplaceAccessRepository(db)

    grant = await repo.get_by_id(grant_id)
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    # ponytail: only operator can approve
    if grant.operator_organization_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Only operator can approve")

    # Use domain method to approve
    try:
        grant.approve(current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    await repo.update(grant)
    await db.commit()

    return _entity_to_dto(grant)


@router.post("/{grant_id}/reject", response_model=AccessGrantResponse)
async def reject_request(
    grant_id: UUID,
    request: RejectRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AccessGrantResponse:
    """Reject a pending marketplace access request (operator only)."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    repo = SqlAlchemyMarketplaceAccessRepository(db)

    grant = await repo.get_by_id(grant_id)
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    if grant.operator_organization_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Only operator can reject")

    # Use domain method to reject
    try:
        grant.reject(current_user.id, request.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    await repo.update(grant)
    await db.commit()

    return _entity_to_dto(grant)


@router.post("/{grant_id}/revoke", response_model=AccessGrantResponse)
async def revoke_access(
    grant_id: UUID,
    request: RevokeRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AccessGrantResponse:
    """Revoke an active grant (either party can revoke)."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    repo = SqlAlchemyMarketplaceAccessRepository(db)

    grant = await repo.get_by_id(grant_id)
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    # ponytail: either party can revoke
    if (
        grant.inventory_owner_organization_id != current_user.tenant_id
        and grant.operator_organization_id != current_user.tenant_id
    ):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Use domain method to revoke
    try:
        grant.revoke(current_user.id, request.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    await repo.update(grant)
    await db.commit()

    return _entity_to_dto(grant)
