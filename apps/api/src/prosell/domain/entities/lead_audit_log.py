"""LeadAuditLog entity - Immutable audit trail for lead status changes."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from prosell.domain.base import ValueObject
from prosell.domain.entities.lead import LeadStatus


class LeadAuditLog(ValueObject):
    """
    Lead audit log entry.

    Immutable record of lead status changes for audit trail.
    Once created, never changes - maintains history of all transitions.
    """

    # Identity fields
    id: UUID
    tenant_id: UUID
    lead_id: UUID

    # Status change
    old_status: LeadStatus
    new_status: LeadStatus

    # Change metadata
    changed_by_user_id: UUID | None = None
    reason: str | None = None

    # Audit timestamp
    created_at: datetime = datetime.now(UTC)

    @classmethod
    def create(
        cls,
        lead_id: UUID,
        tenant_id: UUID,
        old_status: LeadStatus,
        new_status: LeadStatus,
        changed_by_user_id: UUID | None = None,
        reason: str | None = None,
        **kwargs: Any,
    ) -> "LeadAuditLog":
        """
        Factory method for creating audit log entries.

        Args:
            lead_id: ID of the lead being changed
            tenant_id: Unique tenant identifier
            old_status: Previous status
            new_status: New status
            changed_by_user_id: User who made the change (optional)
            reason: Reason for status change (optional)
            **kwargs: Additional optional fields

        Returns:
            New LeadAuditLog entry
        """
        return cls(
            id=uuid4(),
            lead_id=lead_id,
            tenant_id=tenant_id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=changed_by_user_id,
            reason=reason,
            created_at=datetime.now(UTC),
            **kwargs,
        )
