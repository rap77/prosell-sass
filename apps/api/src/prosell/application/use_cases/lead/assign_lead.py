"""AssignLeadToVendedorUseCase — assign or reassign leads to vendedores."""

from uuid import UUID

from prosell.application.dto.lead.request import AssignLeadRequest
from prosell.application.dto.lead.response import LeadResponse
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.value_objects.permission_scope import (
    AllScope,
    ExplicitOrgsScope,
    OwnScope,
)


class AssignLeadToVendedorUseCase:
    """
    Assign a lead to a vendedor.

    Business rules:
    - Managers (AllScope) can reassign leads to any vendedor in their tenant
    - OwnScope users cannot reassign leads (they don't have leads:update for other vendedors)
    - Setting vendedor_id to None unassigns the lead
    - Lead must exist and belong to the tenant/scope
    """

    def __init__(self, lead_repository: AbstractLeadRepository) -> None:
        self.lead_repository = lead_repository

    async def execute(
        self,
        lead_id: UUID,
        request: AssignLeadRequest,
        tenant_id: UUID,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
        actor_id: UUID | None = None,
    ) -> LeadResponse:
        """
        Execute lead assignment.

        Args:
            lead_id: Lead ID to assign
            request: AssignLeadRequest DTO with new vendedor_id
            tenant_id: Tenant ID for isolation
            scope: User's effective ROLE_SCOPE (enforces own vs all visibility)
            actor_id: Authenticated user ID for OwnScope evaluation

        Returns:
            LeadResponse DTO

        Raises:
            LeadNotFoundException: If lead doesn't exist or belongs to different tenant/scope
        """
        lead = await self.lead_repository.assign_to_vendedor(
            lead_id=lead_id,
            tenant_id=tenant_id,
            new_vendedor_id=request.vendedor_id,
            scope=scope,
            actor_id=actor_id,
        )

        return LeadResponse.from_entity(lead)
