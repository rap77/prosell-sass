"""CreateAppointmentUseCase — validates time, checks conflicts, updates lead status."""

from uuid import UUID

from prosell.application.dto.appointment.request import CreateAppointmentRequest
from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.domain.entities.appointment import Appointment
from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.exceptions.appointment_exceptions import (
    AppointmentConflictException,
    AppointmentTimeValidationException,
)
from prosell.domain.repositories.appointment_repository import AbstractAppointmentRepository
from prosell.domain.repositories.lead_repository import AbstractLeadRepository


class CreateAppointmentUseCase:
    """
    Create a new appointment with validation.

    Business rules:
    - Validates business hours (Mon-Fri 9am-6pm) via domain entity
    - Checks for dealer conflicts (1-hour window)
    - Updates lead status to "appointment_set"
    """

    def __init__(
        self,
        appointment_repository: AbstractAppointmentRepository,
        lead_repository: AbstractLeadRepository,
    ) -> None:
        self.appointment_repository = appointment_repository
        self.lead_repository = lead_repository

    async def execute(
        self,
        request: CreateAppointmentRequest,
        tenant_id: UUID,
    ) -> AppointmentResponse:
        """
        Execute appointment creation.

        Args:
            request: CreateAppointmentRequest DTO
            tenant_id: Tenant context from JWT

        Returns:
            AppointmentResponse DTO

        Raises:
            AppointmentTimeValidationException: If time outside business hours
            AppointmentConflictException: If dealer has conflicting appointment
        """
        # 1. Get existing appointments for conflict detection
        existing_appointments = await self.appointment_repository.check_conflicts(
            dealer_id=request.dealer_id,
            scheduled_at=request.scheduled_at,
            tenant_id=tenant_id,
        )

        # 2. Create domain entity (validates business hours)
        appointment = Appointment.create(
            lead_id=request.lead_id,
            dealer_id=request.dealer_id,
            vehicle_id=request.vehicle_id,
            tenant_id=tenant_id,
            scheduled_at=request.scheduled_at,
            notes=request.notes,
            existing_appointments=existing_appointments,
        )

        # 3. Persist appointment
        created = await self.appointment_repository.create(appointment)

        # 4. Update lead status to "appointment_set" (A4.13 requirement)
        await self._update_lead_status(
            lead_id=request.lead_id,
            tenant_id=tenant_id,
        )

        return AppointmentResponse.from_entity(created)

    async def _update_lead_status(self, lead_id: UUID, tenant_id: UUID) -> None:
        """Update lead status to appointment_set after appointment creation."""
        lead = await self.lead_repository.get_by_id(lead_id, tenant_id)
        if not lead:
            return

        # Only update if not already appointment_set
        if lead.status != LeadStatus.APPOINTMENT_SET:
            await self.lead_repository.update_status(
                lead_id=lead_id,
                tenant_id=tenant_id,
                new_status=LeadStatus.APPOINTMENT_SET,
            )
