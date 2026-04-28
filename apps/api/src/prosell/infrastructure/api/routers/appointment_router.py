"""Appointment router — CRUD endpoints for appointment management."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.appointment.request import CreateAppointmentRequest
from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.application.use_cases.appointment.cancel_appointment import CancelAppointmentUseCase
from prosell.application.use_cases.appointment.create_appointment import CreateAppointmentUseCase
from prosell.application.use_cases.appointment.list_appointments import ListAppointmentsUseCase
from prosell.domain.entities.appointment import AppointmentStatus
from prosell.domain.entities.user import User
from prosell.domain.exceptions.appointment_exceptions import (
    AppointmentConflictException,
    AppointmentNotFoundException,
    AppointmentTimeValidationException,
)
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.appointment_repository_impl import SqlAlchemyAppointmentRepository
from prosell.infrastructure.repositories.lead_repository_impl import SqlAlchemyLeadRepository

router = APIRouter()


# =============================================================================
# DEPENDENCY FACTORIES
# =============================================================================


async def get_appointment_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyAppointmentRepository:
    """Get appointment repository instance."""
    return SqlAlchemyAppointmentRepository(session)


async def get_lead_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyLeadRepository:
    """Get lead repository instance."""
    return SqlAlchemyLeadRepository(session)


async def get_create_appointment_use_case(
    appointment_repo: Annotated[SqlAlchemyAppointmentRepository, Depends(get_appointment_repository)],
    lead_repo: Annotated[SqlAlchemyLeadRepository, Depends(get_lead_repository)],
) -> CreateAppointmentUseCase:
    """Get CreateAppointment use case instance."""
    return CreateAppointmentUseCase(appointment_repo, lead_repo)


async def get_list_appointments_use_case(
    appointment_repo: Annotated[SqlAlchemyAppointmentRepository, Depends(get_appointment_repository)],
) -> ListAppointmentsUseCase:
    """Get ListAppointments use case instance."""
    return ListAppointmentsUseCase(appointment_repo)


async def get_cancel_appointment_use_case(
    appointment_repo: Annotated[SqlAlchemyAppointmentRepository, Depends(get_appointment_repository)],
) -> CancelAppointmentUseCase:
    """Get CancelAppointment use case instance."""
    return CancelAppointmentUseCase(appointment_repo)


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

    - Requires authentication (JWT or cookie).
    - tenant_id is extracted from the authenticated user.
    - Validates business hours (Mon-Fri 9am-6pm).
    - Checks for dealer conflicts (1-hour window).
    - Automatically updates lead status to "appointment_set".
    - Returns 409 if a conflict is detected.
    - Returns 400 if time is outside business hours.
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
    except AppointmentTimeValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from None
    except AppointmentConflictException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from None


@router.get(
    "",
    summary="List appointments (role-based)",
)
async def list_appointments(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    start_date: Annotated[
        str | None,
        Query(description="Start date filter (ISO 8601)"),
    ] = None,
    end_date: Annotated[
        str | None,
        Query(description="End date filter (ISO 8601)"),
    ] = None,
    status_filter: Annotated[
        AppointmentStatus | None,
        Query(alias="status", description="Filter by appointment status"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    use_case: Annotated[ListAppointmentsUseCase, Depends(get_list_appointments_use_case)],
):
    """
    List appointments with role-based filtering.

    - **Vendedor**: sees appointments for their leads
    - **Dealer**: sees their own appointments
    - **Manager**: sees all tenant appointments (TODO)

    Supports filtering by date range and status.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )

    from datetime import datetime

    # Parse date filters
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None

    # TODO: Implement role detection and route to appropriate method
    # For now, assume dealer view
    return await use_case.execute_for_dealer(
        tenant_id=current_user.tenant_id,
        dealer_id=current_user.id,
        start_date=start_dt,
        end_date=end_dt,
        status=status_filter,
        limit=limit,
        offset=offset,
    )


@router.put(
    "/{appointment_id}/status",
    response_model=AppointmentResponse,
    summary="Update appointment status",
)
async def update_appointment_status(
    appointment_id: UUID,
    new_status: AppointmentStatus,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[CancelAppointmentUseCase, Depends(get_cancel_appointment_use_case)],
) -> AppointmentResponse:
    """
    Update appointment status (e.g., mark as completed or cancelled).

    - Requires authentication (JWT or cookie).
    - tenant_id is extracted from the authenticated user.
    - Returns 404 if appointment not found.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )

    try:
        # For now, only cancellation is supported via CancelAppointmentUseCase
        if new_status != AppointmentStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only cancellation is supported via this endpoint.",
            )

        return await use_case.execute(
            appointment_id=appointment_id,
            tenant_id=current_user.tenant_id,
        )
    except AppointmentNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from None
