"""Unit tests for NotificationDeliveryDispatcher - TDD RED phase.

CRM roadmap Fase 5 delivery fan-out: one call site (the decorator) feeds
every delivery channel without needing to know how many exist or
whether any of them is wired to a real provider yet.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.domain.entities.notification import Notification, NotificationType
from prosell.infrastructure.services.notification_delivery_dispatcher import (
    NotificationDeliveryDispatcher,
)


def make_notification() -> Notification:
    return Notification.create(
        tenant_id=uuid4(),
        user_id=uuid4(),
        notification_type=NotificationType.LEAD_STALE_NO_ACTIVITY,
        title="Lead sin actividad",
        body="Juan Perez no tiene actividad hace 3 dias",
    )


class TestNotificationDeliveryDispatcher:
    @pytest.mark.asyncio
    async def test_deliver_fans_out_to_every_channel(self):
        notification = make_notification()
        push = AsyncMock()
        whatsapp = AsyncMock()
        dispatcher = NotificationDeliveryDispatcher(push_service=push, whatsapp_service=whatsapp)

        await dispatcher.deliver(notification)

        push.notify.assert_awaited_once_with(notification)
        whatsapp.notify.assert_awaited_once_with(notification)

    @pytest.mark.asyncio
    async def test_deliver_one_channel_failing_does_not_block_the_other(self):
        notification = make_notification()
        push = AsyncMock()
        push.notify.side_effect = RuntimeError("push exploded")
        whatsapp = AsyncMock()
        dispatcher = NotificationDeliveryDispatcher(push_service=push, whatsapp_service=whatsapp)

        await dispatcher.deliver(notification)  # must not raise

        whatsapp.notify.assert_awaited_once_with(notification)

    @pytest.mark.asyncio
    async def test_deliver_never_raises_even_if_every_channel_fails(self):
        notification = make_notification()
        push = AsyncMock()
        push.notify.side_effect = RuntimeError("push exploded")
        whatsapp = AsyncMock()
        whatsapp.notify.side_effect = RuntimeError("whatsapp exploded")
        dispatcher = NotificationDeliveryDispatcher(push_service=push, whatsapp_service=whatsapp)

        await dispatcher.deliver(notification)  # must not raise
