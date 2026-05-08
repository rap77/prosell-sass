"""CreateAppointmentUseCase — validates time, checks conflicts, updates lead status."""

from uuid import UUID

from prosell.application.dto.appointment.request import CreateAppointmentRequest
from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.domain.entities.appointment import Appointment
from prosell.domain.entities.lead import LeadStatus
from prosell.domain.repositories.appointment_repository import AbstractAppointmentRepository
from prosell.domain.repositories.lead_repository import AbstractLeadRepository


class CreateAppointmentUseCase:
    """
    Create a new appointment with validation.

    Business rules:
    - Validates business hours (Mon-Fri 9am-6pm) via domain entity
    - Checks for branch conflicts (1-hour window)
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
            AppointmentConflictException: If branch has conflicting appointment
        """
        # 1. Get existing appointments for conflict detection
        existing_appointments = await self.appointment_repository.check_conflicts(
            user_id=request.user_id,
            scheduled_at=request.scheduled_at,
            tenant_id=tenant_id,
        )

        # 2. Create domain entity (validates business hours)
        appointment = Appointment.create(
            lead_id=request.lead_id,
            user_id=request.user_id,
            product_id=request.product_id,
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
        """Update lead status to appointment_set after appointment creation.

        Gracefully skips the update if the state machine doesn't allow the transition
        (e.g. lead is still in 'new' status and hasn't gone through the sales funnel).
        """
        from prosell.domain.exceptions.lead_exceptions import LeadStateTransitionException

        lead = await self.lead_repository.get_by_id(lead_id, tenant_id)
        if not lead:
            return

        # Only update if not already appointment_set and the transition is valid
        if lead.status != LeadStatus.APPOINTMENT_SET and lead.can_transition_to(LeadStatus.APPOINTMENT_SET):
            try:
                await self.lead_repository.update_status(
                    lead_id=lead_id,
                    tenant_id=tenant_id,
                    new_status=LeadStatus.APPOINTMENT_SET,
                )
            except LeadStateTransitionException:
                # Graceful: appointment is created, lead status update is skipped
                pass
