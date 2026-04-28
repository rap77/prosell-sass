"""Lead DTOs."""

from prosell.application.dto.lead.request import (
    CreateLeadRequest,
    ListLeadsRequest,
    UpdateLeadStatusRequest,
)
from prosell.application.dto.lead.response import (
    LeadAuditLogResponse,
    LeadDetailResponse,
    LeadListResponse,
    LeadResponse,
)

__all__ = [
    "CreateLeadRequest",
    "ListLeadsRequest",
    "UpdateLeadStatusRequest",
    "LeadAuditLogResponse",
    "LeadDetailResponse",
    "LeadListResponse",
    "LeadResponse",
]
