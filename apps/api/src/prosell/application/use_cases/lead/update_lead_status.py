"""UpdateLeadStatusUseCase — validates state transition and persists change."""

from uuid import UUID

from prosell.application.dto.lead.request import UpdateLeadStatusRequest
from prosell.application.dto.lead.response import LeadResponse
from prosell.domain.exceptions.lead_exceptions import (
    LeadNotFoundException,
    LeadStateTransitionException,
)
from prosell.domain.repositories.lead_repository import AbstractLeadRepository


class UpdateLeadStatusUseCase:
    """
    Update lead status with state machine validation.

    Business rules:
    - Transition must be valid per LeadStatus.transitions()
    - Lead must exist and belong to the caller's tenant
    - Audit log entry is created automatically by the repository
    """

    def __init__(self, lead_repository: AbstractLeadRepository) -> None:
        self.lead_repository = lead_repository

    async def execute(
        self,
        lead_id: UUID,
        request: UpdateLeadStatusRequest,
        tenant_id: UUID,
        changed_by_user_id: UUID | None = None,
    ) -> LeadResponse:
        """
        Execute status update.

        Args:
            lead_id: Lead UUID
            request: UpdateLeadStatusRequest DTO
            tenant_id: Tenant context from JWT
            changed_by_user_id: User performing the update (for audit log)

        Returns:
            Updated LeadResponse DTO

        Raises:
            LeadNotFoundException: If lead does not exist in tenant
            LeadStateTransitionException: If transition is invalid
        """
        # Validate lead exists
        from prosell.infrastructure.repositories.lead_repository_impl import LeadWithProduct
        result = await self.lead_repository.get_by_id(lead_id, tenant_id)
        if not result:
            raise LeadNotFoundException(f"Lead not found: {lead_id}")
        lead = result.lead if isinstance(result, LeadWithProduct) else result

        # Validate transition before persisting
        if not lead.can_transition_to(request.new_status):
            raise LeadStateTransitionException(
                current_status=lead.status.value,
                target_status=request.new_status.value,
            )

        # Persist (repository handles audit log creation)
        updated = await self.lead_repository.update_status(
            lead_id=lead_id,
            tenant_id=tenant_id,
            new_status=request.new_status,
            changed_by_user_id=changed_by_user_id,
            reason=request.reason,
        )

        return LeadResponse.from_entity(updated)
