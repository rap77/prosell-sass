"""AbstractNotificationRepository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.notification import Notification


class AbstractNotificationRepository(ABC):
    """Repository interface for Notification entities."""

    @abstractmethod
    async def create(self, notification: Notification) -> Notification:
        """Persist a new notification."""
        ...

    @abstractmethod
    async def get_by_id(self, notification_id: UUID, tenant_id: UUID) -> Notification | None:
        """Get a notification by ID with tenant isolation."""
        ...

    @abstractmethod
    async def list_for_user(
        self,
        user_id: UUID,
        tenant_id: UUID,
        limit: int = 20,
    ) -> list[Notification]:
        """Return the most recent notifications for a user (newest first)."""
        ...

    @abstractmethod
    async def mark_as_read(
        self,
        notification_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
    ) -> Notification | None:
        """Mark a single notification as read.

        Only marks if the notification belongs to user_id (ownership check).
        Returns the updated entity, or None if not found or not owned.
        """
        ...

    @abstractmethod
    async def mark_all_as_read(self, user_id: UUID, tenant_id: UUID) -> int:
        """Mark all unread notifications for a user as read.

        Returns the number of rows updated.
        """
        ...

    @abstractmethod
    async def count_unread(self, user_id: UUID, tenant_id: UUID) -> int:
        """Return the total number of unread notifications for a user."""
        ...
