"""Team router for ProSell SaaS API."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.team import (
    AddTeamMemberRequest,
    CreateTeamRequest,
    TeamListResponse,
    TeamMemberResponse,
    TeamResponse,
    UpdateTeamRequest,
)
from prosell.application.use_cases.team import (
    AddTeamMemberUseCase,
    CreateTeamUseCase,
    GetTeamsByOrganizationUseCase,
    GetTeamUseCase,
    UpdateTeamUseCase,
)
from prosell.domain.entities.user import User
from prosell.domain.exceptions.org_exceptions import (
    OrgDomainException,
    TeamAlreadyExistsException,
    TeamNotFoundException,
)
from prosell.infrastructure.api.dependencies import get_current_auth_user
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.team_repository_impl import (
    SqlAlchemyTeamMemberRepository,
    SqlAlchemyTeamRepository,
)

router = APIRouter()


# =============================================================================
# DEPENDENCY FACTORIES
# =============================================================================


def get_team_repository(
    session: AsyncSession = Depends(get_async_session),
) -> SqlAlchemyTeamRepository:
    """Get team repository instance."""
    return SqlAlchemyTeamRepository(session)


def get_team_member_repository(
    session: AsyncSession = Depends(get_async_session),
) -> SqlAlchemyTeamMemberRepository:
    """Get team member repository instance."""
    return SqlAlchemyTeamMemberRepository(session)


# =============================================================================
# TEAM CRUD ENDPOINTS
# =============================================================================


@router.post(
    "",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new team",
)
async def create_team(
    request: CreateTeamRequest,
    current_user: User = Depends(get_current_auth_user),
    team_repo: SqlAlchemyTeamRepository = Depends(get_team_repository),
) -> TeamResponse:
    """Create a new team (ORG_ADMIN only)."""
    # SECURITY: Verify tenant_id matches authenticated user
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )
    if request.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant ID mismatch - access denied",
        )

    # Override with user's tenant_id to prevent spoofing
    request.tenant_id = current_user.tenant_id

    use_case = CreateTeamUseCase(team_repository=team_repo)
    try:
        return await use_case.execute(request)
    except TeamAlreadyExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message) from e
    except OrgDomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message) from e


@router.get(
    "/org/{org_id}",
    response_model=TeamListResponse,
    summary="List teams for an organization",
)
async def list_teams_by_org(
    org_id: UUID,
    current_user: User = Depends(get_current_auth_user),
    skip: int = 0,
    limit: int = 100,
    team_repo: SqlAlchemyTeamRepository = Depends(get_team_repository),
) -> TeamListResponse:
    """List all teams for an organization."""
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    use_case = GetTeamsByOrganizationUseCase(team_repository=team_repo)
    return await use_case.execute(
        org_id=org_id,
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{team_id}",
    response_model=TeamResponse,
    summary="Get team by ID",
)
async def get_team(
    team_id: UUID,
    current_user: User = Depends(get_current_auth_user),
    team_repo: SqlAlchemyTeamRepository = Depends(get_team_repository),
) -> TeamResponse:
    """Get team by ID (with tenant isolation)."""
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    use_case = GetTeamUseCase(team_repository=team_repo)
    try:
        return await use_case.execute(team_id=team_id, tenant_id=current_user.tenant_id)
    except TeamNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.patch(
    "/{team_id}",
    response_model=TeamResponse,
    summary="Update team",
)
async def update_team(
    team_id: UUID,
    request: UpdateTeamRequest,
    current_user: User = Depends(get_current_auth_user),
    team_repo: SqlAlchemyTeamRepository = Depends(get_team_repository),
) -> TeamResponse:
    """Update team basic info."""
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    use_case = UpdateTeamUseCase(team_repository=team_repo)
    try:
        return await use_case.execute(
            team_id=team_id,
            tenant_id=current_user.tenant_id,
            request=request,
        )
    except TeamNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


# =============================================================================
# TEAM MEMBER ENDPOINTS
# =============================================================================


@router.post(
    "/{team_id}/members",
    response_model=TeamMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add member to team",
)
async def add_team_member(
    team_id: UUID,
    request: AddTeamMemberRequest,
    current_user: User = Depends(get_current_auth_user),
    team_repo: SqlAlchemyTeamRepository = Depends(get_team_repository),
    team_member_repo: SqlAlchemyTeamMemberRepository = Depends(get_team_member_repository),
) -> TeamMemberResponse:
    """Add a user as a member to a team."""
    # SECURITY: Verify tenant_id matches authenticated user
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )
    if request.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant ID mismatch - access denied",
        )

    # Override with user's tenant_id to prevent spoofing
    request.tenant_id = current_user.tenant_id

    use_case = AddTeamMemberUseCase(
        team_repository=team_repo,
        team_member_repository=team_member_repo,
    )
    try:
        return await use_case.execute(
            team_id=team_id,
            user_id=request.user_id,
            tenant_id=request.tenant_id,
            role=request.role,
            commission_rate=request.commission_rate,
        )
    except TeamNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
