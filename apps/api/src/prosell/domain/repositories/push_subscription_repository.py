"""AbstractPushSubscriptionRepository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.push_subscription import PushSubscription


class AbstractPushSubscriptionRepository(ABC):
    """Repository interface for PushSubscription entities."""

    @abstractmethod
    async def upsert(self, subscription: PushSubscription) -> PushSubscription:
        """Persist a subscription, replacing any existing row with the same endpoint."""
        ...

    @abstractmethod
    async def delete_by_endpoint(
        self,
        endpoint: str,
        user_id: UUID,
        tenant_id: UUID,
    ) -> None:
        """Remove a subscription by endpoint (ownership-scoped, no-op if absent)."""
        ...

    @abstractmethod
    async def list_for_user(self, user_id: UUID, tenant_id: UUID) -> list[PushSubscription]:
        """Return every subscription registered for a user."""
        ...
