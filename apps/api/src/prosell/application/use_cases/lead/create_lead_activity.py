"""CreateLeadActivityUseCase — log a manual note/call on a lead.

CRM roadmap Fase 4 ("Twenty concept: Activities").
"""

from uuid import UUID

from prosell.application.dto.lead.request import CreateLeadActivityRequest
from prosell.application.dto.lead.response import LeadActivityResponse
from prosell.domain.entities.lead_activity import LeadActivity
from prosell.domain.repositories.lead_repository import AbstractLeadRepository


class CreateLeadActivityUseCase:
    """
    Log a manual activity entry (note/call) on a lead.

    Business rules:
    - Lead must exist and belong to the caller's tenant (enforced by
      the repository, which raises LeadNotFoundException otherwise —
      same discipline as UpdateLeadStatusUseCase's audit log write).
    """

    def __init__(self, lead_repository: AbstractLeadRepository) -> None:
        self.lead_repository = lead_repository

    async def execute(
        self,
        lead_id: UUID,
        request: CreateLeadActivityRequest,
        tenant_id: UUID,
        created_by_user_id: UUID | None = None,
    ) -> LeadActivityResponse:
        activity = LeadActivity.create(
            lead_id=lead_id,
            tenant_id=tenant_id,
            activity_type=request.type,
            content=request.content,
            created_by_user_id=created_by_user_id,
        )
        created = await self.lead_repository.create_activity(activity)
        return LeadActivityResponse.from_entity(created)
