"""Unit tests for DeliveringNotificationRepository - TDD RED phase.

CRM roadmap Fase 5. This decorator is the ONLY place that changes to
turn on push/WhatsApp delivery — CreateLeadUseCase and
NotifyStaleLeadsUseCase keep calling `notification_repository.create()`
exactly as before, unaware anything new is happening.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.domain.entities.notification import Notification, NotificationType
from prosell.infrastructure.repositories.delivering_notification_repository import (
    DeliveringNotificationRepository,
)


def make_notification() -> Notification:
    return Notification.create(
        tenant_id=uuid4(),
        user_id=uuid4(),
        notification_type=NotificationType.LEAD_STALE_NO_ACTIVITY,
        title="Lead sin actividad",
        body="Juan Perez no tiene actividad hace 3 dias",
    )


class TestDeliveringNotificationRepository:
    @pytest.mark.asyncio
    async def test_create_persists_then_delivers(self):
        notification = make_notification()
        inner = AsyncMock()
        inner.create.return_value = notification
        dispatcher = AsyncMock()

        repo = DeliveringNotificationRepository(inner=inner, dispatcher=dispatcher)
        result = await repo.create(notification)

        inner.create.assert_awaited_once_with(notification)
        dispatcher.deliver.assert_awaited_once_with(notification)
        assert result is notification

    @pytest.mark.asyncio
    async def test_create_delivery_failure_does_not_block_persistence_result(self):
        notification = make_notification()
        inner = AsyncMock()
        inner.create.return_value = notification
        dispatcher = AsyncMock()
        dispatcher.deliver.side_effect = RuntimeError("dispatcher exploded")

        repo = DeliveringNotificationRepository(inner=inner, dispatcher=dispatcher)
        result = await repo.create(notification)  # must not raise

        assert result is notification

    @pytest.mark.asyncio
    async def test_other_methods_delegate_to_inner_untouched(self):
        inner = AsyncMock()
        dispatcher = AsyncMock()
        repo = DeliveringNotificationRepository(inner=inner, dispatcher=dispatcher)

        notification_id = uuid4()
        tenant_id = uuid4()
        user_id = uuid4()

        await repo.get_by_id(notification_id, tenant_id)
        inner.get_by_id.assert_awaited_once_with(notification_id, tenant_id)

        await repo.list_for_user(user_id, tenant_id, limit=10)
        inner.list_for_user.assert_awaited_once_with(user_id, tenant_id, limit=10)

        await repo.mark_as_read(notification_id, tenant_id, user_id)
        inner.mark_as_read.assert_awaited_once_with(notification_id, tenant_id, user_id)

        await repo.mark_all_as_read(user_id, tenant_id)
        inner.mark_all_as_read.assert_awaited_once_with(user_id, tenant_id)

        await repo.count_unread(user_id, tenant_id)
        inner.count_unread.assert_awaited_once_with(user_id, tenant_id)

        dispatcher.deliver.assert_not_awaited()
