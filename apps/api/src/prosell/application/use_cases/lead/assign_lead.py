"""AssignLeadToVendedorUseCase — assign or reassign leads to vendedores."""

from uuid import UUID

from prosell.application.dto.lead.request import AssignLeadRequest
from prosell.application.dto.lead.response import LeadResponse
from prosell.domain.repositories.lead_repository import AbstractLeadRepository


class AssignLeadToVendedorUseCase:
    """
    Assign a lead to a vendedor.

    Business rules:
    - Managers can reassign leads to any vendedor in their tenant
    - Setting vendedor_id to None unassigns the lead
    - Lead must exist and belong to the tenant
    """

    def __init__(self, lead_repository: AbstractLeadRepository) -> None:
        self.lead_repository = lead_repository

    async def execute(
        self,
        lead_id: UUID,
        request: AssignLeadRequest,
        tenant_id: UUID,
    ) -> LeadResponse:
        """
        Execute lead assignment.

        Args:
            lead_id: Lead ID to assign
            request: AssignLeadRequest DTO with new vendedor_id
            tenant_id: Tenant ID for isolation

        Returns:
            LeadResponse DTO

        Raises:
            LeadNotFoundException: If lead doesn't exist or belongs to different tenant
        """
        lead = await self.lead_repository.assign_to_vendedor(
            lead_id=lead_id,
            tenant_id=tenant_id,
            new_vendedor_id=request.vendedor_id,
        )

        return LeadResponse.from_entity(lead)
