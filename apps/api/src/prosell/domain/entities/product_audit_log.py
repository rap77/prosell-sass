"""ProductAuditLog entity - Immutable audit trail for product status changes."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from prosell.domain.base import Field, ValueObject
from prosell.domain.value_objects.product_status import ProductStatus


class ProductAuditLog(ValueObject):
    """
    Product audit log entry.

    Immutable record of product status changes for audit trail.
    Once created, never changes - maintains history of all transitions.
    """

    # Identity fields
    id: UUID
    tenant_id: UUID
    product_id: UUID

    # Status change
    old_status: ProductStatus
    new_status: ProductStatus

    # Change metadata
    changed_by_user_id: UUID | None = None
    reason: str | None = None

    # Audit timestamp
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        product_id: UUID,
        tenant_id: UUID,
        old_status: ProductStatus,
        new_status: ProductStatus,
        changed_by_user_id: UUID | None = None,
        reason: str | None = None,
    ) -> "ProductAuditLog":
        """
        Factory method for creating audit log entries.

        Args:
            product_id: ID of the product being changed
            tenant_id: Unique tenant identifier
            old_status: Previous status
            new_status: New status
            changed_by_user_id: User who made the change (optional)
            reason: Reason for status change (optional)

        Returns:
            New ProductAuditLog entry
        """
        return cls(
            id=uuid4(),
            product_id=product_id,
            tenant_id=tenant_id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=changed_by_user_id,
            reason=reason,
            created_at=datetime.now(UTC),
        )
