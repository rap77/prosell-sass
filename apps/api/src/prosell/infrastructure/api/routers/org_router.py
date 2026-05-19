"""Organization router for ProSell SaaS API."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.org import (
    CreateOrganizationRequest,
    OrganizationListResponse,
    OrganizationResponse,
    UpdateOrganizationRequest,
    UploadUrlRequest,
    UploadUrlResponse,
)
from pydantic import BaseModel
from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.application.use_cases.org import (
    CompleteSetupUseCase,
    CreateOrganizationUseCase,
    GetOrganizationByTenantUseCase,
    GetOrganizationUseCase,
    ListOrganizationsUseCase,
    RejectOrganizationUseCase,
    SuspendOrganizationUseCase,
    UpdateOrganizationUseCase,
    VerifyOrganizationUseCase,
)
from prosell.domain.entities.role import Permission, RoleType
from prosell.domain.entities.user import User
from prosell.domain.exceptions.org_exceptions import (
    OrganizationAlreadyExistsException,
    OrganizationNotFoundException,
    OrganizationVerificationException,
    OrgDomainException,
)
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_spaces_service,
    require_permission,
    require_role,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.organization_repository_impl import (
    SqlAlchemyOrganizationRepository,
)
from prosell.infrastructure.repositories.wallet_repository_impl import (
    SqlAlchemyWalletRepository,
)
from prosell.infrastructure.services.do_spaces_service import (
    generate_banner_path,
    generate_logo_path,
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
    _current_user: User = Depends(require_permission(Permission.ORG_CREATE)),
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
        return await use_case.execute(request)
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
    current_user: User = Depends(get_current_auth_user_from_cookie),
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Get the organization associated with the authenticated user's tenant."""
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    use_case = GetOrganizationByTenantUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(tenant_id=current_user.tenant_id)
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


class CompleteSetupRequest(BaseModel):
    """Request body for completing onboarding setup."""

    setup_complete: bool = True


@router.patch(
    "/me/setup",
    response_model=OrganizationResponse,
    summary="Mark organization onboarding as complete",
)
async def complete_org_setup(
    request: CompleteSetupRequest,
    current_user: User = Depends(require_role(RoleType.MANAGER)),
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Mark the current organization's onboarding wizard as complete or skip.

    Requires at minimum MANAGER role — vendedor-only users cannot modify org setup state.
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    use_case = CompleteSetupUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(
            tenant_id=current_user.tenant_id,
            setup_complete=request.setup_complete,
        )
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.get(
    "/{org_id}",
    response_model=OrganizationResponse,
    summary="Get organization by ID",
)
async def get_organization(
    org_id: UUID,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Get organization by ID (with tenant isolation)."""
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    use_case = GetOrganizationUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(org_id=org_id, tenant_id=current_user.tenant_id)
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
    current_user: User = Depends(get_current_auth_user_from_cookie),
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Update organization basic info, logo, banner, or settings."""
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    use_case = UpdateOrganizationUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(
            org_id=org_id, tenant_id=current_user.tenant_id, request=request
        )
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
    except OrgDomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


# =============================================================================
# UPLOAD ENDPOINTS
# =============================================================================


@router.post(
    "/{org_id}/upload-url",
    response_model=UploadUrlResponse,
    summary="Generate presigned URL for logo/banner upload",
)
async def get_upload_url(
    org_id: UUID,
    request: UploadUrlRequest,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
    spaces: IDOSpacesService = Depends(get_spaces_service),
) -> UploadUrlResponse:
    """
    Generate a presigned PUT URL for uploading org logo or banner directly to DO Spaces.

    Flow:
    1. Frontend calls this endpoint to get a presigned URL
    2. Frontend PUTs the file directly to upload_url
    3. Frontend PATCHes the org with logo_url=public_url or banner_url=public_url
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    use_case = GetOrganizationUseCase(org_repository=org_repo)
    try:
        await use_case.execute(org_id=org_id, tenant_id=current_user.tenant_id)
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e

    if request.file_type == "logo":
        file_path = generate_logo_path(str(org_id))
    else:
        file_path = generate_banner_path(str(org_id))

    result = await spaces.generate_presigned_url(
        file_path=file_path,
        content_type=request.content_type,
    )
    return UploadUrlResponse.model_validate(result)


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
    current_user: User = Depends(require_role(RoleType.SUPER_ADMIN)),
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Approve organization verification (SUPER_ADMIN only)."""
    use_case = VerifyOrganizationUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(
            org_id=org_id,
            verifier_id=current_user.id,
            tenant_id=current_user.tenant_id,
        )
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
    current_user: User = Depends(require_role(RoleType.SUPER_ADMIN)),
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Reject organization verification (SUPER_ADMIN only)."""
    use_case = RejectOrganizationUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(
            org_id=org_id,
            verifier_id=current_user.id,
            tenant_id=current_user.tenant_id,
        )
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
    current_user: User = Depends(require_role(RoleType.SUPER_ADMIN)),
    org_repo: SqlAlchemyOrganizationRepository = Depends(get_org_repository),
) -> OrganizationResponse:
    """Suspend organization (SUPER_ADMIN only)."""
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    use_case = SuspendOrganizationUseCase(org_repository=org_repo)
    try:
        return await use_case.execute(org_id=org_id, tenant_id=current_user.tenant_id)
    except OrganizationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
