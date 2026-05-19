"""Notification entity - Pure domain logic with no external dependencies."""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import Field

from prosell.domain.base import DomainModel


class NotificationType(StrEnum):
    """Notification type classification."""

    LEAD_ASSIGNED = "lead_assigned"
    LEAD_STATUS_CHANGED = "lead_status_changed"
    APPOINTMENT_SCHEDULED = "appointment_scheduled"
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    SYSTEM = "system"


class Notification(DomainModel):
    """Notification entity.

    Pure domain logic - no external dependencies.
    Represents an in-app notification for a specific user within a tenant.
    """

    # Identity fields
    id: UUID
    tenant_id: UUID

    # Target user (who receives this notification)
    user_id: UUID

    # Notification content
    notification_type: NotificationType
    title: str
    body: str

    # Optional resource link (for navigation on click)
    resource_type: str | None = None  # e.g., "lead", "appointment"
    resource_id: UUID | None = None   # e.g., the lead's UUID

    # Read state
    is_read: bool = False
    read_at: datetime | None = None

    # Audit fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        tenant_id: UUID,
        user_id: UUID,
        notification_type: NotificationType,
        title: str,
        body: str,
        resource_type: str | None = None,
        resource_id: UUID | None = None,
        **kwargs: Any,
    ) -> "Notification":
        """Factory method for new notification creation.

        Args:
            tenant_id: Tenant identifier
            user_id: Target user identifier
            notification_type: Notification type classification
            title: Short notification title
            body: Full notification body text
            resource_type: Type of related resource (optional)
            resource_id: ID of related resource (optional)
            **kwargs: Additional optional fields

        Returns:
            New Notification entity
        """
        return cls(
            id=uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            body=body,
            resource_type=resource_type,
            resource_id=resource_id,
            is_read=False,
            read_at=None,
            created_at=datetime.now(UTC),
            **kwargs,
        )

    def mark_as_read(self) -> None:
        """Mark notification as read.

        Idempotent - calling on an already-read notification has no effect.
        """
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.now(UTC)

    def is_unread(self) -> bool:
        """Check if notification has not been read."""
        return not self.is_read
