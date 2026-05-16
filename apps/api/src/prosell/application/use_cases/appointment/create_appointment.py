"""CreateAppointmentUseCase — validates time, checks conflicts, updates lead status."""

from contextlib import suppress
from uuid import UUID

from prosell.application.dto.appointment.request import CreateAppointmentRequest
from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.entities.lead import LeadStatus
from prosell.domain.exceptions.appointment_exceptions import AppointmentConflictException
from prosell.domain.repositories.appointment_repository import AbstractAppointmentRepository
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.services.appointment_conflict_detector import AppointmentConflictDetector


class CreateAppointmentUseCase:
    """
    Create a new appointment with validation.

    Business rules:
    - Validates business hours (Mon-Fri 9am-6pm) via domain entity
    - Checks for branch conflicts (1-hour window) via conflict detector
    - Updates lead status to "appointment_set"
    """

    def __init__(
        self,
        appointment_repository: AbstractAppointmentRepository,
        lead_repository: AbstractLeadRepository,
        conflict_detector: AppointmentConflictDetector,
    ) -> None:
        self.appointment_repository = appointment_repository
        self.lead_repository = lead_repository
        self.conflict_detector = conflict_detector

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

        # 2. Create a temporary appointment object for conflict detection
        # (not persisted yet, just used for detection)
        temp_appointment = Appointment(
            id=None,  # Not assigned yet
            tenant_id=tenant_id,
            lead_id=request.lead_id,
            user_id=request.user_id,
            product_id=request.product_id,
            scheduled_at=request.scheduled_at,
            notes=request.notes,
            status=AppointmentStatus.SCHEDULED,
        )

        # 3. Check for conflicts using the conflict detector
        conflicts = self.conflict_detector.detect_conflicts(
            temp_appointment, existing_appointments
        )

        if conflicts and not request.force:
            # Raise exception with conflict details (unless force=True)
            raise AppointmentConflictException(
                user_id=str(request.user_id),
                scheduled_at=request.scheduled_at.isoformat(),
                conflicts=conflicts,
            )

        # 4. Create domain entity (validates business hours)
        # Note: We don't pass existing_appointments here since we already checked conflicts
        appointment = Appointment.create(
            lead_id=request.lead_id,
            user_id=request.user_id,
            product_id=request.product_id,
            tenant_id=tenant_id,
            scheduled_at=request.scheduled_at,
            notes=request.notes,
            existing_appointments=None,  # Already checked via conflict detector
        )

        # 5. Persist appointment
        created = await self.appointment_repository.create(appointment)

        # 6. Update lead status to "appointment_set" (A4.13 requirement)
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
        if lead.status != LeadStatus.APPOINTMENT_SET and lead.can_transition_to(LeadStatus.APPOINTMENT_SET):  # noqa: E501
            with suppress(LeadStateTransitionException):
                await self.lead_repository.update_status(
                    lead_id=lead_id,
                    tenant_id=tenant_id,
                    new_status=LeadStatus.APPOINTMENT_SET,
                )
