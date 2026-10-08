"""LeadActivity entity - manual CRM timeline entries for a lead.

Roadmap CRM Fase 4 ("Twenty concept: Activities"). Distinct from
LeadAuditLog (immutable record of status transitions only): a
LeadActivity is a free-form note or call log an agent/manager adds by
hand — both feed the same timeline UI, but neither replaces the other.
"""

from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from prosell.domain.base import Field, ValueObject


class LeadActivityType(StrEnum):
    """Kind of manual activity entry."""

    NOTE = "note"
    CALL = "call"


class LeadActivity(ValueObject):
    """
    Lead activity entry.

    Immutable, append-only timeline entry for a lead — once created,
    never changes (same discipline as LeadAuditLog).
    """

    # Identity fields
    id: UUID
    tenant_id: UUID
    lead_id: UUID

    # Content
    type: LeadActivityType
    content: str

    # Actor
    created_by_user_id: UUID | None = None

    # Timestamp
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        lead_id: UUID,
        tenant_id: UUID,
        activity_type: LeadActivityType,
        content: str,
        created_by_user_id: UUID | None = None,
    ) -> "LeadActivity":
        """
        Factory method for creating activity entries.

        Args:
            lead_id: ID of the lead this activity belongs to
            tenant_id: Unique tenant identifier
            activity_type: note | call (maps to the `type` field — named
                `activity_type` here only to avoid shadowing the `type`
                builtin in this function's scope)
            content: Free-form text (what was said/done)
            created_by_user_id: User who logged the activity (optional)

        Returns:
            New LeadActivity entry
        """
        return cls(
            id=uuid4(),
            lead_id=lead_id,
            tenant_id=tenant_id,
            type=activity_type,
            content=content,
            created_by_user_id=created_by_user_id,
            created_at=datetime.now(UTC),
        )
