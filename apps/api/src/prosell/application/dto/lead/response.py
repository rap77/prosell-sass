"""Lead response DTOs."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.lead_audit_log import LeadAuditLog


class LeadResponse(BaseModel):
    """DTO for a single lead."""

    id: UUID
    tenant_id: UUID
    buyer_name: str
    buyer_email: str | None
    buyer_phone: str | None
    vehicle_id: UUID | None
    vendedor_id: UUID | None
    message: str | None
    source: str
    status: LeadStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_entity(cls, lead: Lead) -> "LeadResponse":
        """Create response DTO from domain entity."""
        return cls(
            id=lead.id,
            tenant_id=lead.tenant_id,
            buyer_name=lead.buyer_name,
            buyer_email=lead.buyer_email,
            buyer_phone=lead.buyer_phone,
            vehicle_id=lead.vehicle_id,
            vendedor_id=lead.vendedor_id,
            message=lead.message,
            source=lead.source,
            status=lead.status,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
        )


class LeadAuditLogResponse(BaseModel):
    """DTO for a single audit log entry."""

    id: UUID
    lead_id: UUID
    old_status: LeadStatus
    new_status: LeadStatus
    changed_by_user_id: UUID | None
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_entity(cls, log: LeadAuditLog) -> "LeadAuditLogResponse":
        """Create response DTO from domain entity."""
        return cls(
            id=log.id,
            lead_id=log.lead_id,
            old_status=log.old_status,
            new_status=log.new_status,
            changed_by_user_id=log.changed_by_user_id,
            reason=log.reason,
            created_at=log.created_at,
        )


class LeadDetailResponse(BaseModel):
    """DTO for lead details with audit history."""

    lead: LeadResponse
    audit_logs: list[LeadAuditLogResponse]


class LeadListResponse(BaseModel):
    """DTO for paginated list of leads."""

    items: list[LeadResponse]
    total: int
    limit: int
    offset: int
