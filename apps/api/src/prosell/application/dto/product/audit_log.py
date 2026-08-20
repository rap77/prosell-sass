"""DTO for the product audit-logs endpoint."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from prosell.domain.entities.product_audit_log import ProductAuditLog


class ProductAuditLogResponse(BaseModel):
    """One status-change entry in a product's audit trail."""

    id: UUID
    old_status: str
    new_status: str
    changed_by_user_id: UUID | None = None
    reason: str | None = None
    created_at: datetime

    @classmethod
    def from_entity(cls, log: ProductAuditLog) -> "ProductAuditLogResponse":
        """Build response from domain entity."""
        return cls(
            id=log.id,
            old_status=log.old_status.value,
            new_status=log.new_status.value,
            changed_by_user_id=log.changed_by_user_id,
            reason=log.reason,
            created_at=log.created_at,
        )
