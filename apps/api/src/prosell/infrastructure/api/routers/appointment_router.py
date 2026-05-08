"""Appointment router — CRUD endpoints for appointment management."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.appointment.request import CreateAppointmentRequest
from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.application.use_cases.appointment.cancel_appointment import CancelAppointmentUseCase
from prosell.application.use_cases.appointment.confirm_appointment import ConfirmAppointmentUseCase
from prosell.application.use_cases.appointment.create_appointment import CreateAppointmentUseCase
from prosell.domain.entities.appointment import AppointmentStatus
from prosell.domain.entities.user import User
from prosell.domain.exceptions.appointment_exceptions import (
    AppointmentConflictException,
    AppointmentNotFoundException,
    AppointmentTimeValidationException,
)
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie, get_email_service
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.appointment_repository_impl import (
    SqlAlchemyAppointmentRepository,
)
from prosell.infrastructure.repositories.lead_repository_impl import SqlAlchemyLeadRepository
from prosell.infrastructure.repositories.product_repository_impl import SqlAlchemyProductRepository
from prosell.infrastructure.repositories.user_repository_impl import SqlAlchemyUserRepository

router = APIRouter()


# =============================================================================
# REQUEST / RESPONSE MODELS
# =============================================================================


class UpdateAppointmentRequest(BaseModel):
    """Request body for updating an appointment's status and/or notes."""

    status: str | None = None
    notes: str | None = Field(None, max_length=2000)


class AppointmentListResponse(BaseModel):
    """Paginated appointment list response."""

    items: list[AppointmentResponse]
    total: int
    limit: int
    offset: int


# =============================================================================
# DEPENDENCY FACTORIES
# =============================================================================


async def get_appointment_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyAppointmentRepository:
    return SqlAlchemyAppointmentRepository(session)


async def get_lead_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyLeadRepository:
    return SqlAlchemyLeadRepository(session)


async def get_create_appointment_use_case(
    appointment_repo: Annotated[SqlAlchemyAppointmentRepository, Depends(get_appointment_repository)],
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
) -> CreateAppointmentUseCase:
    return CreateAppointmentUseCase(appointment_repo, lead_repo)


async def get_local_user_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyUserRepository:
    return SqlAlchemyUserRepository(session)


async def get_local_product_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyProductRepository:
    return SqlAlchemyProductRepository(session)


async def get_cancel_appointment_use_case(
    appointment_repo: Annotated[SqlAlchemyAppointmentRepository, Depends(get_appointment_repository)],
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
    email_service: Annotated[any, Depends(get_email_service)],
    user_repo: Annotated[SqlAlchemyUserRepository, Depends(get_local_user_repository)],
    product_repo: Annotated[SqlAlchemyProductRepository, Depends(get_local_product_repository)],
) -> CancelAppointmentUseCase:
    return CancelAppointmentUseCase(
        appointment_repository=appointment_repo,
        lead_repository=lead_repo,
        email_service=email_service,
        user_repository=user_repo,
        product_repository=product_repo,
    )


async def get_confirm_appointment_use_case(
    appointment_repo: Annotated[SqlAlchemyAppointmentRepository, Depends(get_appointment_repository)],
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
    email_service: Annotated[any, Depends(get_email_service)],
    user_repo: Annotated[SqlAlchemyUserRepository, Depends(get_local_user_repository)],
    product_repo: Annotated[SqlAlchemyProductRepository, Depends(get_local_product_repository)],
) -> ConfirmAppointmentUseCase:
    return ConfirmAppointmentUseCase(
        appointment_repository=appointment_repo,
        lead_repository=lead_repo,
        email_service=email_service,
        user_repository=user_repo,
        product_repository=product_repo,
    )


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new appointment",
)
async def create_appointment(
    request: CreateAppointmentRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[CreateAppointmentUseCase, Depends(get_create_appointment_use_case)],
) -> AppointmentResponse:
    """
    Create a new appointment.

    - Validates business hours (Mon-Fri 9am-6pm) — returns 422 if outside.
    - Checks for conflicts (1-hour window) — returns 409.
    - Updates lead status to "appointment_set" automatically.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )

    try:
        return await use_case.execute(request=request, tenant_id=current_user.tenant_id)
    except AppointmentTimeValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from None
    except AppointmentConflictException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from None


@router.get(
    "",
    response_model=AppointmentListResponse,
    summary="List appointments with optional filters",
)
async def list_appointments(
    appointment_repo: Annotated[SqlAlchemyAppointmentRepository, Depends(get_appointment_repository)],
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    start_date: Annotated[str | None, Query(description="Start date filter (ISO 8601)")] = None,
    end_date: Annotated[str | None, Query(description="End date filter (ISO 8601)")] = None,
    status_filter: Annotated[
        AppointmentStatus | None,
        Query(alias="status", description="Filter by appointment status"),
    ] = None,
    dealer_id: Annotated[UUID | None, Query(description="Filter by dealer/user ID")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AppointmentListResponse:
    """
    List appointments for the authenticated tenant.

    - `dealer_id`: filter by the attending dealer/user (maps to `user_id`).
    - `status`: filter by appointment status enum.
    - `start_date` / `end_date`: ISO 8601 date range filter.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )

    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None

    appointments, total = await appointment_repo.list_all(
        tenant_id=current_user.tenant_id,
        user_id=dealer_id,
        start_date=start_dt,
        end_date=end_dt,
        status=status_filter,
        limit=limit,
        offset=offset,
    )

    items = [AppointmentResponse.from_entity(a) for a in appointments]
    return AppointmentListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/{appointment_id}",
    response_model=AppointmentResponse,
    summary="Get appointment by ID",
)
async def get_appointment(
    appointment_id: UUID,
    appointment_repo: Annotated[SqlAlchemyAppointmentRepository, Depends(get_appointment_repository)],
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
) -> AppointmentResponse:
    """Get a single appointment by ID with tenant isolation."""
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )

    appointment = await appointment_repo.get_by_id(appointment_id, current_user.tenant_id)
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment not found: {appointment_id}",
        )

    return AppointmentResponse.from_entity(appointment)


@router.put(
    "/{appointment_id}",
    response_model=AppointmentResponse,
    summary="Update appointment status and/or notes",
)
async def update_appointment(
    appointment_id: UUID,
    request: UpdateAppointmentRequest,
    appointment_repo: Annotated[SqlAlchemyAppointmentRepository, Depends(get_appointment_repository)],
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
) -> AppointmentResponse:
    """Update appointment status and/or notes. Both fields are optional."""
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )

    new_status: AppointmentStatus | None = None
    if request.status is not None:
        try:
            new_status = AppointmentStatus(request.status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status: '{request.status}'. Valid values: {[s.value for s in AppointmentStatus]}",
            ) from None

    try:
        appointment = await appointment_repo.update_appointment(
            appointment_id=appointment_id,
            tenant_id=current_user.tenant_id,
            new_status=new_status,
            notes=request.notes,
        )
    except AppointmentNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None

    return AppointmentResponse.from_entity(appointment)


@router.put(
    "/{appointment_id}/status",
    response_model=AppointmentResponse,
    summary="Update appointment status via use cases (cancel/confirm)",
)
async def update_appointment_status(
    appointment_id: UUID,
    new_status: AppointmentStatus,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    cancel_use_case: Annotated[CancelAppointmentUseCase, Depends(get_cancel_appointment_use_case)],
    confirm_use_case: Annotated[ConfirmAppointmentUseCase, Depends(get_confirm_appointment_use_case)],
) -> AppointmentResponse:
    """
    Update via domain use cases (sends email notifications).
    Only COMPLETED and CANCELLED are supported here.
    For other status updates use PUT /{id} with body.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )

    try:
        if new_status == AppointmentStatus.COMPLETED:
            return await confirm_use_case.execute(
                appointment_id=appointment_id,
                tenant_id=current_user.tenant_id,
            )
        elif new_status == AppointmentStatus.CANCELLED:
            return await cancel_use_case.execute(
                appointment_id=appointment_id,
                tenant_id=current_user.tenant_id,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Use PUT /{appointment_id} for status '{new_status.value}'.",
            )
    except AppointmentNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None
