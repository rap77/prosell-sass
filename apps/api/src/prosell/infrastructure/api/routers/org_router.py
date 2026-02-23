"""Organization router for ProSell SaaS API."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.org import (
    CreateOrganizationRequest,
    OrganizationListResponse,
    OrganizationResponse,
    UpdateOrganizationRequest,
)
from prosell.application.use_cases.org import (
    CreateOrganizationUseCase,
    GetOrganizationByTenantUseCase,
    GetOrganizationUseCase,
    ListOrganizationsUseCase,
    RejectOrganizationUseCase,
    SuspendOrganizationUseCase,
    UpdateOrganizationUseCase,
    VerifyOrganizationUseCase,
)
from prosell.domain.exceptions.org_exceptions import (
    OrganizationAlreadyExistsException,
    OrganizationNotFoundException,
    OrganizationVerificationException,
    OrgDomainException,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.organization_repository_impl import (
    SqlAlchemyOrganizationRepository,
)
from prosell.infrastructure.repositories.wallet_repository_impl import (
    SqlAlchemyWalletRepository,
)

router = APIRouter()


# =============================================================================
# DEPENDENCY FACTORIES
# =============================================================================


def get_org_repository(
    session: AsyncSession = Depends(get_async_session),
) -> SqlAlchemyOrganizationRepository:
    """Get organization repository instance."""
    return SqlAlchemyOrganizationRepository(session)


def get_wallet_repository(
    session: AsyncSession = Depends(get_async_session),
) -> SqlAlchemyWalletRepository:
    """Get wallet repository instance."""
    return SqlAlchemyWalletRepository(session)


# =============================================================================
# ORGANIZATION CRUD ENDPOINTS
# =============================================================================


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new organization",
)
async def create_organization(
    request: CreateOrganizationRequest,
    creator_id: UUID,  # TODO: replace with get_current_user dependency
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
    wallet_repo: SqlAlchemyWalletRepository = Depends(get_wallet_repository),
) -> OrganizationResponse:
    """
    Create a new organization (MASTER/SUPER_ADMIN only).

    Provisions org in PENDING_VERIFICATION status and creates a default wallet.
    """
    use_case = CreateOrganizationUseCase(
        org_repository=org_repo,
        wallet_repository=wallet_repo,
    )
    try:
        return await use_case.execute(request, creator_id=creator_id)
    except OrganizationAlreadyExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message) from e
    except OrgDomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.get(
    "",
    response_model=OrganizationListResponse,
    summary="List organizations",
)
async def list_organizations(
    skip: int = 0,
    limit: int = 100,
    tenant_id: UUID | None = None,
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationListResponse:
    """
    List organizations.

    - SUPER_ADMIN: can pass tenant_id=None to see all orgs
    - ORG_ADMIN: only sees their own org (enforce tenant_id in middleware)
    """
    use_case = ListOrganizationsUseCase(org_repository=org_repo)
    return await use_case.execute(tenant_id=tenant_id, skip=skip, limit=limit)


@router.get(
    "/me",
    response_model=OrganizationResponse,
    summary="Get current user's organization",
)
async def get_my_organization(
    tenant_id: UUID,  # TODO: from get_current_user
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Get the organization associated with the authenticated user's tenant."""
    use_case = GetOrganizationByTenantUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(tenant_id=tenant_id)
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.get(
    "/{org_id}",
    response_model=OrganizationResponse,
    summary="Get organization by ID",
)
async def get_organization(
    org_id: UUID,
    tenant_id: UUID,  # TODO: from get_current_user
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Get organization by ID (with tenant isolation)."""
    use_case = GetOrganizationUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(org_id=org_id, tenant_id=tenant_id)
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.patch(
    "/{org_id}",
    response_model=OrganizationResponse,
    summary="Update organization",
)
async def update_organization(
    org_id: UUID,
    request: UpdateOrganizationRequest,
    tenant_id: UUID,  # TODO: from get_current_user
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Update organization basic info, logo, banner, or settings."""
    use_case = UpdateOrganizationUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(org_id=org_id, tenant_id=tenant_id, request=request)
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
    except OrgDomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


# =============================================================================
# VERIFICATION ENDPOINTS (SUPER_ADMIN only)
# =============================================================================


@router.post(
    "/{org_id}/verify",
    response_model=OrganizationResponse,
    summary="Approve organization verification",
)
async def verify_organization(
    org_id: UUID,
    verifier_id: UUID,  # TODO: from get_current_user
    tenant_id: UUID | None = None,  # None = SUPER_ADMIN can verify any org
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Approve organization verification (SUPER_ADMIN only)."""
    use_case = VerifyOrganizationUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(org_id=org_id, verifier_id=verifier_id, tenant_id=tenant_id)
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
    except OrganizationVerificationException as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.message
        ) from e


@router.post(
    "/{org_id}/reject",
    response_model=OrganizationResponse,
    summary="Reject organization verification",
)
async def reject_organization(
    org_id: UUID,
    verifier_id: UUID,  # TODO: from get_current_user
    tenant_id: UUID | None = None,  # None = SUPER_ADMIN can reject any org
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Reject organization verification (SUPER_ADMIN only)."""
    use_case = RejectOrganizationUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(org_id=org_id, verifier_id=verifier_id, tenant_id=tenant_id)
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
    except OrganizationVerificationException as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.message
        ) from e


@router.post(
    "/{org_id}/suspend",
    response_model=OrganizationResponse,
    summary="Suspend an organization",
)
async def suspend_organization(
    org_id: UUID,
    tenant_id: UUID,  # TODO: from get_current_user
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Suspend organization (SUPER_ADMIN only)."""
    use_case = SuspendOrganizationUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(org_id=org_id, tenant_id=tenant_id)
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
