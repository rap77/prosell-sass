"""CancelAppointmentUseCase — cancels an appointment."""

from uuid import UUID

from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.domain.entities.appointment import AppointmentStatus
from prosell.domain.exceptions.appointment_exceptions import AppointmentNotFoundException
from prosell.domain.repositories.appointment_repository import AbstractAppointmentRepository


class CancelAppointmentUseCase:
    """
    Cancel an appointment.

    Business rules:
    - Only scheduled appointments can be cancelled
    - Cancelled/completed appointments cannot be cancelled again
    """

    def __init__(self, appointment_repository: AbstractAppointmentRepository) -> None:
        self.appointment_repository = appointment_repository

    async def execute(
        self,
        appointment_id: UUID,
        tenant_id: UUID,
    ) -> AppointmentResponse:
        """
        Execute appointment cancellation.

        Args:
            appointment_id: Appointment UUID
            tenant_id: Tenant context from JWT

        Returns:
            AppointmentResponse DTO

        Raises:
            AppointmentNotFoundException: If appointment not found
        """
        # Update status to cancelled
        updated = await self.appointment_repository.update_status(
            appointment_id=appointment_id,
            tenant_id=tenant_id,
            new_status=AppointmentStatus.CANCELLED,
        )

        return AppointmentResponse.from_entity(updated)
