"""CreateLeadUseCase — validates input and persists new lead."""

from uuid import UUID

from prosell.application.dto.lead.request import CreateLeadRequest
from prosell.application.dto.lead.response import LeadResponse
from prosell.domain.entities.lead import Lead
from prosell.domain.exceptions.lead_exceptions import DuplicateLeadException
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.services.lead_duplicate_detector import LeadDuplicateDetector


class CreateLeadUseCase:
    """
    Create a new lead with duplicate detection.

    Business rules:
    - If same buyer (email or phone) + same product_id already exists within 24h,
      raise DuplicateLeadException.
    - At least buyer_name must be provided.
    - vendedor_id is optional (can be assigned later).
    - Uses LeadDuplicateDetector for enhanced duplicate detection.
    """

    def __init__(self, lead_repository: AbstractLeadRepository) -> None:
        self.lead_repository = lead_repository
        self.duplicate_detector = LeadDuplicateDetector(lead_repository)

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
        # 1. Enhanced duplicate detection using LeadDuplicateDetector
        duplicates = await self.duplicate_detector.find_duplicates(
            email=request.buyer_email,
            phone=request.buyer_phone,
            tenant_id=tenant_id,
        )

        if duplicates:
            # Check if any duplicate is for the same product within 24h
            for dup in duplicates:
                dup_lead = await self.lead_repository.get_by_id(
                    lead_id=dup.lead_id,
                    tenant_id=tenant_id,
                )
                if dup_lead and dup_lead.product_id == request.product_id:
                    # Same buyer + same product = hard duplicate
                    raise DuplicateLeadException(
                        f"A lead for this buyer and vehicle already exists (lead ID: {dup.lead_id}). "
                        "Please wait 24 hours before creating another."
                    )

            # If duplicates exist but for different products, still warn but allow
            # (This could be enhanced to return warnings in the response)

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
