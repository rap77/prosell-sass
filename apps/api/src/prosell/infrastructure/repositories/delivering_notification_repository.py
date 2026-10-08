"""DeliveringNotificationRepository — decorator that adds secondary-channel
delivery (push, WhatsApp, ...) on top of a plain AbstractNotificationRepository.

CRM roadmap Fase 5. This is the ONLY change needed to turn delivery on:
`CreateLeadUseCase` and `NotifyStaleLeadsUseCase` keep calling
`notification_repository.create()` exactly as before — they never know
this wrapper exists. Swap which concrete repository gets constructed at
the DI call site, nothing else.
"""

import logging
from uuid import UUID

from prosell.domain.entities.notification import Notification
from prosell.domain.repositories.notification_repository import AbstractNotificationRepository
from prosell.infrastructure.services.notification_delivery_dispatcher import (
    NotificationDeliveryDispatcher,
)

logger = logging.getLogger(__name__)


class DeliveringNotificationRepository(AbstractNotificationRepository):
    """Wraps a real AbstractNotificationRepository, delivering to secondary
    channels after a successful persist. Delegates every other method
    untouched."""

    def __init__(
        self,
        inner: AbstractNotificationRepository,
        dispatcher: NotificationDeliveryDispatcher,
    ) -> None:
        self._inner = inner
        self._dispatcher = dispatcher

    async def create(self, notification: Notification) -> Notification:
        created = await self._inner.create(notification)
        try:
            await self._dispatcher.deliver(created)
        except Exception:  # delivery is best-effort, persistence already succeeded
            logger.exception(
                "Notification delivery dispatch failed for notification %s", created.id
            )
        return created

    async def get_by_id(self, notification_id: UUID, tenant_id: UUID) -> Notification | None:
        return await self._inner.get_by_id(notification_id, tenant_id)

    async def list_for_user(
        self,
        user_id: UUID,
        tenant_id: UUID,
        limit: int = 20,
    ) -> list[Notification]:
        return await self._inner.list_for_user(user_id, tenant_id, limit=limit)

    async def mark_as_read(
        self,
        notification_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
    ) -> Notification | None:
        return await self._inner.mark_as_read(notification_id, tenant_id, user_id)

    async def mark_all_as_read(self, user_id: UUID, tenant_id: UUID) -> int:
        return await self._inner.mark_all_as_read(user_id, tenant_id)

    async def count_unread(self, user_id: UUID, tenant_id: UUID) -> int:
        return await self._inner.count_unread(user_id, tenant_id)
