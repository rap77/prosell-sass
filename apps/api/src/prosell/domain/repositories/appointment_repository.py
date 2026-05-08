"""AbstractAppointmentRepository interface."""

from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from prosell.domain.entities.appointment import Appointment, AppointmentStatus


class AbstractAppointmentRepository(ABC):
    """Repository interface for Appointment entities."""

    @abstractmethod
    async def create(
        self,
        appointment: Appointment,
    ) -> Appointment:
        """Create a new appointment.

        Args:
            appointment: Appointment entity to create

        Returns:
            Created appointment with generated ID

        Raises:
            AppointmentConflictException: If branch has conflicting appointment
        """
        pass

    @abstractmethod
    async def get_by_id(
        self,
        appointment_id: UUID,
        tenant_id: UUID,
    ) -> Appointment | None:
        """Get appointment by ID with tenant isolation.

        Args:
            appointment_id: Appointment UUID
            tenant_id: Tenant UUID for multi-tenant isolation

        Returns:
            Appointment entity or None if not found
        """
        pass

    @abstractmethod
    async def list_by_branch(
        self,
        tenant_id: UUID,
        user_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        status: AppointmentStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Appointment], int]:
        """List appointments for a branch with pagination.

        Args:
            tenant_id: Tenant UUID
            user_id: User UUID (the user attending)
            start_date: Optional start date filter
            end_date: Optional end date filter
            status: Optional status filter
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            Tuple of (appointments, total_count)
        """
        pass

    @abstractmethod
    async def list_by_vendedor(
        self,
        tenant_id: UUID,
        vendedor_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        status: AppointmentStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Appointment], int]:
        """List appointments for a vendedor with pagination.

        Args:
            tenant_id: Tenant UUID
            vendedor_id: Vendedor UUID (user ID)
            start_date: Optional start date filter
            end_date: Optional end date filter
            status: Optional status filter
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            Tuple of (appointments, total_count)
        """
        pass

    @abstractmethod
    async def update_status(
        self,
        appointment_id: UUID,
        tenant_id: UUID,
        new_status: AppointmentStatus,
    ) -> Appointment:
        """Update appointment status.

        Args:
            appointment_id: Appointment UUID
            tenant_id: Tenant UUID
            new_status: New status to set

        Returns:
            Updated appointment

        Raises:
            AppointmentNotFoundException: If appointment not found
        """
        pass

    @abstractmethod
    async def check_conflicts(
        self,
        user_id: UUID,
        scheduled_at: datetime,
        tenant_id: UUID,
        exclude_appointment_id: UUID | None = None,
    ) -> list[Appointment]:
        """Check for conflicting appointments for a branch.

        Args:
            user_id: User UUID
            scheduled_at: Proposed appointment time
            tenant_id: Tenant UUID
            exclude_appointment_id: Optional appointment ID to exclude (for updates)

        Returns:
            List of conflicting appointments
        """
        pass
