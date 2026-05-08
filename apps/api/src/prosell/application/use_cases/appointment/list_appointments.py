"""ListAppointmentsUseCase — role-based filtering for appointments."""

from datetime import datetime
from uuid import UUID

from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.domain.entities.appointment import AppointmentStatus
from prosell.domain.repositories.appointment_repository import AbstractAppointmentRepository


class ListAppointmentsUseCase:
    """
    List appointments with role-based filtering.

    Business rules:
    - Branchs see their own appointments
    - Vendedores see appointments for their leads
    - Managers see all tenant appointments
    """

    def __init__(self, appointment_repository: AbstractAppointmentRepository) -> None:
        self.appointment_repository = appointment_repository

    async def execute_for_branch(
        self,
        tenant_id: UUID,
        user_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        status: AppointmentStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[AppointmentResponse], int]:
        """
        List appointments for a branch.

        Args:
            tenant_id: Tenant context from JWT
            user_id: User ID attending
            start_date: Optional start date filter
            end_date: Optional end date filter
            status: Optional status filter
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            Tuple of (appointment responses, total count)
        """
        appointments, total = await self.appointment_repository.list_by_branch(
            tenant_id=tenant_id,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            status=status,
            limit=limit,
            offset=offset,
        )

        return (
            [AppointmentResponse.from_entity(a) for a in appointments],
            total,
        )

    async def execute_for_vendedor(
        self,
        tenant_id: UUID,
        vendedor_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        status: AppointmentStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[AppointmentResponse], int]:
        """
        List appointments for a vendedor.

        Args:
            tenant_id: Tenant context from JWT
            vendedor_id: Vendedor's user ID
            start_date: Optional start date filter
            end_date: Optional end date filter
            status: Optional status filter
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            Tuple of (appointment responses, total count)
        """
        appointments, total = await self.appointment_repository.list_by_vendedor(
            tenant_id=tenant_id,
            vendedor_id=vendedor_id,
            start_date=start_date,
            end_date=end_date,
            status=status,
            limit=limit,
            offset=offset,
        )

        return (
            [AppointmentResponse.from_entity(a) for a in appointments],
            total,
        )

    async def execute_for_manager(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[AppointmentResponse], int]:
        """
        List all appointments for a tenant (manager view).

        Args:
            tenant_id: Tenant context from JWT
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            Tuple of (appointment responses, total count)
        """
        # For manager view, we list all appointments across all branches
        # This would require a new repository method, for now use user_id=None pattern
        # Implementation deferred to A4.23 (API endpoint)
        raise NotImplementedError("Manager view requires additional repository method")
