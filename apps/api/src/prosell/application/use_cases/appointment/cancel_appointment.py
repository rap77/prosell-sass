"""CancelAppointmentUseCase — cancels an appointment and sends email."""

from uuid import UUID

from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.domain.entities.appointment import AppointmentStatus
from prosell.domain.exceptions.appointment_exceptions import AppointmentNotFoundException
from prosell.domain.repositories.appointment_repository import AbstractAppointmentRepository
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository


class CancelAppointmentUseCase:
    """
    Cancel an appointment.

    Business rules:
    - Only scheduled appointments can be cancelled
    - Cancelled/completed appointments cannot be cancelled again
    - Sends email notification to buyer if email available
    """

    def __init__(
        self,
        appointment_repository: AbstractAppointmentRepository,
        lead_repository: AbstractLeadRepository,
        email_service,
        user_repository: AbstractUserRepository,
        product_repository: AbstractProductRepository,
    ) -> None:
        self.appointment_repository = appointment_repository
        self.lead_repository = lead_repository
        self.email_service = email_service
        self.user_repository = user_repository
        self.product_repository = product_repository

    async def execute(
        self,
        appointment_id: UUID,
        tenant_id: UUID,
    ) -> AppointmentResponse:
        appointment = await self.appointment_repository.get_by_id(
            appointment_id=appointment_id,
            tenant_id=tenant_id,
        )

        if not appointment:
            raise AppointmentNotFoundException(f"Appointment not found: {appointment_id}")

        updated = await self.appointment_repository.update_status(
            appointment_id=appointment_id,
            tenant_id=tenant_id,
            new_status=AppointmentStatus.CANCELLED,
        )

        lead = await self.lead_repository.get_by_id(
            lead_id=appointment.lead_id,
            tenant_id=tenant_id,
        )

        if lead and lead.buyer_email:
            user = await self.user_repository.get_by_id(appointment.user_id)
            user_name = user.full_name if user else "Tu Asesor"

            product = await self.product_repository.get_by_id(appointment.product_id, tenant_id)
            product_info = product.title if product else "Tu Vehículo"

            await self.email_service.send_appointment_status_update(
                buyer_email=lead.buyer_email,
                buyer_name=lead.buyer_name,
                branch_name=user_name,
                vehicle_info=product_info,
                scheduled_at=updated.scheduled_at,
                new_status=AppointmentStatus.CANCELLED,
                notes=updated.notes,
            )

        return AppointmentResponse.from_entity(updated)
