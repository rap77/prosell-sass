"""ConfirmAppointmentUseCase — confirms an appointment and sends email."""

from uuid import UUID

from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.entities.lead import Lead
from prosell.domain.exceptions.appointment_exceptions import AppointmentNotFoundException
from prosell.domain.repositories.appointment_repository import AbstractAppointmentRepository
from prosell.domain.repositories.lead_repository import AbstractLeadRepository


class ConfirmAppointmentUseCase:
    """
    Confirm an appointment.

    Business rules:
    - Marks appointment as COMPLETED
    - Sends email notification to buyer if email available
    - Gracefully handles missing lead or missing email
    """

    def __init__(
        self,
        appointment_repository: AbstractAppointmentRepository,
        lead_repository: AbstractLeadRepository,
        email_service,  # AbstractEmailService (Protocol)
    ) -> None:
        self.appointment_repository = appointment_repository
        self.lead_repository = lead_repository
        self.email_service = email_service

    async def execute(
        self,
        appointment_id: UUID,
        tenant_id: UUID,
    ) -> AppointmentResponse:
        """
        Execute appointment confirmation.

        Args:
            appointment_id: Appointment UUID
            tenant_id: Tenant context from JWT

        Returns:
            AppointmentResponse DTO

        Raises:
            AppointmentNotFoundException: If appointment not found
        """
        # Get appointment first to check if it exists
        appointment = await self.appointment_repository.get_by_id(
            appointment_id=appointment_id,
            tenant_id=tenant_id,
        )

        if not appointment:
            raise AppointmentNotFoundException(f"Appointment not found: {appointment_id}")

        # Update status to completed
        updated = await self.appointment_repository.update_status(
            appointment_id=appointment_id,
            tenant_id=tenant_id,
            new_status=AppointmentStatus.COMPLETED,
        )

        # Try to get lead for email notification
        lead = await self.lead_repository.get_by_id(
            lead_id=appointment.lead_id,
            tenant_id=tenant_id,
        )

        # Send email if lead exists and has email
        if lead and lead.buyer_email:
            # We need to get dealer name and vehicle info for the email
            # For now, we'll use placeholder info - in production, you'd fetch these
            # from the user and vehicle repositories
            await self.email_service.send_appointment_status_update(
                buyer_email=lead.buyer_email,
                buyer_name=lead.buyer_name,
                dealer_name="Tu Asesor",  # TODO: Fetch from user repository
                vehicle_info="Tu Vehículo",  # TODO: Fetch from vehicle repository
                scheduled_at=updated.scheduled_at,
                new_status=AppointmentStatus.COMPLETED,
                notes=updated.notes,
            )

        return AppointmentResponse.from_entity(updated)
