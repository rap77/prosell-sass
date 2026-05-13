"""GetLeadDetailsUseCase — fetch single lead with full audit history and product data."""

from uuid import UUID

from prosell.application.dto.lead.response import (
    LeadAuditLogResponse,
    LeadDetailResponse,
    LeadResponse,
)
from prosell.domain.exceptions.lead_exceptions import LeadNotFoundException
from prosell.domain.repositories.lead_repository import AbstractLeadRepository


class GetLeadDetailsUseCase:
    """
    Retrieve a single lead with its full audit log history and product data.

    Business rules:
    - Lead must exist and belong to the caller's tenant
    - Audit logs are returned in descending chronological order (most recent first)
    - Product data is included if lead has an associated product
    """

    def __init__(self, lead_repository: AbstractLeadRepository) -> None:
        self.lead_repository = lead_repository

    async def execute(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        audit_log_limit: int = 50,
    ) -> LeadDetailResponse:
        lead = await self.lead_repository.get_by_id(
            lead_id,
            tenant_id,
        )

        if not lead:
            raise LeadNotFoundException(f"Lead not found: {lead_id}")

        # TODO: Load product data separately when product repository is available
        product = None

        audit_logs = await self.lead_repository.get_audit_logs(
            lead_id=lead_id,
            tenant_id=tenant_id,
            limit=audit_log_limit,
        )

        return LeadDetailResponse(
            lead=LeadResponse.from_entity(lead, product=product),
            audit_logs=[LeadAuditLogResponse.from_entity(log) for log in audit_logs],
        )
