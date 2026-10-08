"""UnsubscribeFromPushUseCase — remove a browser's Web Push subscription.

CRM roadmap Fase 5 delivery channel.
"""

from uuid import UUID

from prosell.domain.repositories.push_subscription_repository import (
    AbstractPushSubscriptionRepository,
)


class UnsubscribeFromPushUseCase:
    """Remove a push subscription, scoped to the authenticated user."""

    def __init__(self, repository: AbstractPushSubscriptionRepository) -> None:
        self.repository = repository

    async def execute(self, tenant_id: UUID, user_id: UUID, endpoint: str) -> None:
        await self.repository.delete_by_endpoint(endpoint, user_id, tenant_id)
