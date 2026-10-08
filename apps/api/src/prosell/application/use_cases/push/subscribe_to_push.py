"""SubscribeToPushUseCase — register a browser's Web Push subscription.

CRM roadmap Fase 5 delivery channel.
"""

from uuid import UUID

from prosell.domain.entities.push_subscription import PushSubscription
from prosell.domain.repositories.push_subscription_repository import (
    AbstractPushSubscriptionRepository,
)


class SubscribeToPushUseCase:
    """Upsert a push subscription for the authenticated user."""

    def __init__(self, repository: AbstractPushSubscriptionRepository) -> None:
        self.repository = repository

    async def execute(
        self,
        tenant_id: UUID,
        user_id: UUID,
        endpoint: str,
        p256dh: str,
        auth: str,
    ) -> PushSubscription:
        subscription = PushSubscription.create(
            tenant_id=tenant_id,
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
        )
        return await self.repository.upsert(subscription)
