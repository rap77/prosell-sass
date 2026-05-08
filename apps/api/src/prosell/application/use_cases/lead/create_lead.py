"""CreateLeadUseCase — validates input and persists new lead."""

from uuid import UUID

from prosell.application.dto.lead.request import CreateLeadRequest
from prosell.application.dto.lead.response import LeadResponse
from prosell.domain.entities.lead import Lead
from prosell.domain.exceptions.lead_exceptions import DuplicateLeadException
from prosell.domain.repositories.lead_repository import AbstractLeadRepository


class CreateLeadUseCase:
    """
    Create a new lead with duplicate detection.

    Business rules:
    - If same buyer (email or phone) + same product_id already exists within 24h,
      raise DuplicateLeadException.
    - At least buyer_name must be provided.
    - vendedor_id is optional (can be assigned later).
    """

    def __init__(self, lead_repository: AbstractLeadRepository) -> None:
        self.lead_repository = lead_repository

    async def execute(
        self,
        request: CreateLeadRequest,
        tenant_id: UUID,
    ) -> LeadResponse:
        """
        Execute lead creation.

        Args:
            request: CreateLeadRequest DTO
            tenant_id: Tenant context from JWT

        Returns:
            LeadResponse DTO

        Raises:
            DuplicateLeadException: If same buyer + vehicle within 24h
        """
        # 1. Duplicate detection: same buyer (email or phone) + vehicle within 24h
        existing = await self.lead_repository.get_by_buyer_and_product(
            buyer_email=request.buyer_email,
            buyer_phone=request.buyer_phone,
            product_id=request.product_id,
            tenant_id=tenant_id,
            within_hours=24,
        )
        if existing:
            raise DuplicateLeadException(
                "A lead for this buyer and vehicle already exists. "
                "Please wait 24 hours before creating another."
            )

        # 2. Create domain entity
        lead = Lead.create(
            buyer_name=request.buyer_name,
            tenant_id=tenant_id,
            buyer_email=request.buyer_email,
            buyer_phone=request.buyer_phone,
            product_id=request.product_id,
            vendedor_id=request.vendedor_id,
            message=request.message,
            source=request.source,
        )

        # 3. Persist
        created = await self.lead_repository.create(lead)

        return LeadResponse.from_entity(created)
