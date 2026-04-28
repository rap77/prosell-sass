"""Lead router — CRUD endpoints for lead management."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.lead.request import (
    CreateLeadRequest,
    ListLeadsRequest,
    UpdateLeadStatusRequest,
)
from prosell.application.dto.lead.response import (
    LeadDetailResponse,
    LeadListResponse,
    LeadResponse,
)
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.application.use_cases.lead.get_lead_details import GetLeadDetailsUseCase
from prosell.application.use_cases.lead.list_leads import ListLeadsUseCase
from prosell.application.use_cases.lead.update_lead_status import UpdateLeadStatusUseCase
from prosell.domain.entities.lead import LeadStatus
from prosell.domain.entities.user import User
from prosell.domain.exceptions.lead_exceptions import (
    DuplicateLeadException,
    LeadNotFoundException,
    LeadStateTransitionException,
)
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.lead_repository_impl import SqlAlchemyLeadRepository

router = APIRouter()


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
) -> CreateLeadUseCase:
    """Get CreateLead use case instance."""
    return CreateLeadUseCase(lead_repo)


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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No organization associated with account.")
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
) -> LeadListResponse:
    """
    List leads with pagination and role-based filtering.

    - SALES_AGENT: sees only leads assigned to themselves.
    - MANAGER / ADMIN / SUPER_ADMIN: sees all leads in the tenant.
    - tenant_id is always derived from the JWT — no cross-tenant access.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No organization associated with account.")
    list_request = ListLeadsRequest(
        limit=limit,
        offset=offset,
        status=lead_status,
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No organization associated with account.")
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No organization associated with account.")
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
