"""Lead router — CRUD endpoints for lead management."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.lead.request import (
    AssignLeadRequest,
    CreateLeadRequest,
    ListLeadsRequest,
    UpdateLeadStatusRequest,
)
from prosell.application.dto.lead.response import (
    LeadDetailResponse,
    LeadListResponse,
    LeadResponse,
    TeamMetricsResponse,
)
from prosell.application.use_cases.lead.assign_lead import AssignLeadToVendedorUseCase
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.application.use_cases.lead.get_lead_details import GetLeadDetailsUseCase
from prosell.application.use_cases.lead.get_team_metrics import GetTeamMetricsUseCase
from prosell.application.use_cases.lead.list_leads import ListLeadsUseCase
from prosell.application.use_cases.lead.update_lead_status import UpdateLeadStatusUseCase
from prosell.domain.entities.lead import LeadStatus
from prosell.domain.entities.user import User
from prosell.domain.exceptions.lead_exceptions import (
    DuplicateLeadException,
    LeadNotFoundException,
    LeadStateTransitionException,
)
from prosell.domain.services.lead_assignment_rules_engine import LeadAssignmentRulesEngine
from prosell.domain.services.lead_duplicate_detector import DuplicateMatch, LeadDuplicateDetector
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.schemas.lead_schemas import (
    DuplicateMatchResponse,
    DuplicatesResponse,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.lead_repository_impl import (
    LeadWithProduct,
    SqlAlchemyLeadRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import SqlAlchemyProductRepository
from prosell.infrastructure.repositories.team_repository_impl import (
    SqlAlchemyTeamMemberRepository,
    SqlAlchemyTeamRepository,
)
from prosell.infrastructure.repositories.user_repository_impl import SqlAlchemyUserRepository

router = APIRouter()

# Shared assignment engine singleton — round-robin state must persist across requests
# so that consecutive leads are distributed evenly across dealers.
_shared_assignment_engine = LeadAssignmentRulesEngine()


# =============================================================================
# DEPENDENCY FACTORIES
# =============================================================================


async def get_lead_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyLeadRepository:
    """Get lead repository instance."""
    return SqlAlchemyLeadRepository(session)


async def get_create_lead_use_case(
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> CreateLeadUseCase:
    """Get CreateLead use case instance with all repositories for auto-assignment.

    The shared assignment engine is injected so that round-robin state
    persists across requests within the same process lifetime.
    """
    return CreateLeadUseCase(
        lead_repository=lead_repo,
        user_repository=SqlAlchemyUserRepository(session),
        product_repository=SqlAlchemyProductRepository(session),
        team_repository=SqlAlchemyTeamRepository(session),
        team_member_repository=SqlAlchemyTeamMemberRepository(session),
        assignment_engine=_shared_assignment_engine,
    )


async def get_update_lead_status_use_case(
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
) -> UpdateLeadStatusUseCase:
    """Get UpdateLeadStatus use case instance."""
    return UpdateLeadStatusUseCase(lead_repo)


async def get_list_leads_use_case(
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
) -> ListLeadsUseCase:
    """Get ListLeads use case instance."""
    return ListLeadsUseCase(lead_repo)


async def get_lead_details_use_case(
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
) -> GetLeadDetailsUseCase:
    """Get GetLeadDetails use case instance."""
    return GetLeadDetailsUseCase(lead_repo)


async def get_assign_lead_use_case(
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
) -> AssignLeadToVendedorUseCase:
    """Get AssignLead use case instance."""
    return AssignLeadToVendedorUseCase(lead_repo)


async def get_team_metrics_use_case(
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
) -> GetTeamMetricsUseCase:
    """Get TeamMetrics use case instance."""
    from prosell.infrastructure.repositories.user_repository_impl import SqlAlchemyUserRepository
    user_repo = SqlAlchemyUserRepository(lead_repo.session)
    return GetTeamMetricsUseCase(lead_repo, user_repo)


async def get_duplicate_detector(
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
) -> LeadDuplicateDetector:
    """Get LeadDuplicateDetector instance."""
    return LeadDuplicateDetector(lead_repo)


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.post(
    "",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lead (manual)",
)
async def create_lead(
    request: CreateLeadRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[CreateLeadUseCase, Depends(get_create_lead_use_case)],
) -> LeadResponse:
    """
    Create a new lead manually.

    - Requires authentication (JWT or cookie).
    - tenant_id is extracted from the authenticated user — no spoofing.
    - Returns 409 if a duplicate lead is detected (same buyer + vehicle within 24h).
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    try:
        return await use_case.execute(
            request=request,
            tenant_id=current_user.tenant_id,
        )
    except DuplicateLeadException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from None


@router.get(
    "",
    response_model=LeadListResponse,
    summary="List leads (role-based)",
)
async def list_leads(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[ListLeadsUseCase, Depends(get_list_leads_use_case)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    lead_status: LeadStatus | None = Query(default=None, alias="status"),
    vendedor_id: UUID | None = Query(default=None, description="Filter by vendedor ID (manager-only)"),  # noqa: E501
) -> LeadListResponse:
    """
    List leads with pagination and role-based filtering.

    - SALES_AGENT: sees only leads assigned to themselves.
    - MANAGER / ADMIN / SUPER_ADMIN: sees all leads in the tenant.
    - vendedor_id filter allows managers to filter by specific vendedor.
    - tenant_id is always derived from the JWT — no cross-tenant access.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    list_request = ListLeadsRequest(
        limit=limit,
        offset=offset,
        status=lead_status,
        vendedor_id=vendedor_id,
    )
    return await use_case.execute(user=current_user, request=list_request)


@router.get(
    "/{lead_id}",
    response_model=LeadDetailResponse,
    summary="Get lead details with audit history",
)
async def get_lead_details(
    lead_id: UUID,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[GetLeadDetailsUseCase, Depends(get_lead_details_use_case)],
) -> LeadDetailResponse:
    """
    Get a single lead with its full audit log history.

    - Returns 404 if lead does not exist or belongs to a different tenant.
    - Audit logs are ordered from most recent to oldest.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    try:
        return await use_case.execute(
            lead_id=lead_id,
            tenant_id=current_user.tenant_id,
        )
    except LeadNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None


@router.put(
    "/{lead_id}/status",
    response_model=LeadResponse,
    summary="Update lead status",
)
async def update_lead_status(
    lead_id: UUID,
    request: UpdateLeadStatusRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[UpdateLeadStatusUseCase, Depends(get_update_lead_status_use_case)],
) -> LeadResponse:
    """
    Update lead status following the 5-state lifecycle.

    Valid transitions:
    - new → contacted | lost
    - contacted → qualified | lost
    - qualified → appointment_set | lost
    - appointment_set → lost
    - lost → (terminal, no further transitions)

    Returns 404 if lead not found, 422 if transition is invalid.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    try:
        return await use_case.execute(
            lead_id=lead_id,
            request=request,
            tenant_id=current_user.tenant_id,
            changed_by_user_id=current_user.id,
        )
    except LeadNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None
    except LeadStateTransitionException as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from None


@router.put(
    "/{lead_id}/assign",
    response_model=LeadResponse,
    summary="Assign lead to vendedor",
)
async def assign_lead(
    lead_id: UUID,
    request: AssignLeadRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[AssignLeadToVendedorUseCase, Depends(get_assign_lead_use_case)],
) -> LeadResponse:
    """
    Assign or reassign a lead to a vendedor.

    - Managers can reassign leads to any vendedor in their tenant.
    - Setting vendedor_id to null unassigns the lead.
    - Lead must exist and belong to the tenant.
    - Returns 404 if lead not found.
    - Returns 403 if user has no tenant_id.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    try:
        return await use_case.execute(
            lead_id=lead_id,
            request=request,
            tenant_id=current_user.tenant_id,
        )
    except LeadNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None


@router.get(
    "/{lead_id}/duplicates",
    response_model=DuplicatesResponse,
    summary="Get potential duplicates for a lead",
)
async def get_lead_duplicates(
    lead_id: UUID,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
    detector: Annotated[LeadDuplicateDetector, Depends(get_duplicate_detector)],
) -> DuplicatesResponse:
    """
    Return potential duplicate leads for the given lead_id.

    Fetches the lead's email and phone, then runs LeadDuplicateDetector
    excluding the lead itself. Useful for displaying duplicate warnings
    in the lead detail view without re-running detection on creation.

    - Returns empty list if no duplicates found.
    - Returns 404 if lead does not belong to the current tenant.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )

    # Fetch the lead to extract contact fields
    lead_result = await lead_repo.get_by_id(lead_id=lead_id, tenant_id=current_user.tenant_id)
    if not lead_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead {lead_id} not found.",
        )
    # Narrow union type: get_by_id returns Lead or LeadWithProduct depending on include_product
    lead = lead_result.lead if isinstance(lead_result, LeadWithProduct) else lead_result

    duplicates: list[DuplicateMatch] = await detector.find_duplicates(
        email=lead.buyer_email,
        phone=lead.buyer_phone,
        tenant_id=current_user.tenant_id,
        exclude_lead_id=lead_id,
    )

    return DuplicatesResponse(
        lead_id=lead_id,
        duplicates=[
            DuplicateMatchResponse(
                lead_id=dup.lead_id,
                match_type=dup.match_type,
                confidence=dup.confidence,
            )
            for dup in duplicates
        ],
        count=len(duplicates),
    )


@router.get(
    "/metrics",
    response_model=TeamMetricsResponse,
    summary="Get team lead metrics",
)
async def get_team_metrics(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[GetTeamMetricsUseCase, Depends(get_team_metrics_use_case)],
) -> TeamMetricsResponse:
    """
    Get team lead metrics (managers and admins only).

    Returns aggregated metrics including:
    - Total leads count
    - New leads in last 24 hours
    - Conversion rate (leads → appointment_set)
    - Breakdown by vendedor with individual stats

    Returns 403 if user is not a manager or admin.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    try:
        return await use_case.execute(
            tenant_id=current_user.tenant_id,
            user=current_user,
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from None
