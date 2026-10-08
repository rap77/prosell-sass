"""Unit tests for WebPushNotificationService - TDD RED phase.

CRM roadmap Fase 5 delivery channel. Never raises, swallows per-subscription
failures, self-heals by deleting subscriptions the push service reports
as expired (404/410).
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from pywebpush import WebPushException

from prosell.domain.entities.notification import Notification, NotificationType
from prosell.domain.entities.push_subscription import PushSubscription
from prosell.infrastructure.services.web_push_notification_service import (
    WebPushNotificationService,
)


def make_notification(user_id=None, tenant_id=None) -> Notification:
    return Notification.create(
        tenant_id=tenant_id or uuid4(),
        user_id=user_id or uuid4(),
        notification_type=NotificationType.LEAD_STALE_NO_ACTIVITY,
        title="Lead sin actividad",
        body="Juan Perez no tiene actividad hace 3 dias",
        resource_type="lead",
        resource_id=uuid4(),
    )


def make_subscription(endpoint="https://fcm.googleapis.com/fcm/send/abc") -> PushSubscription:
    return PushSubscription.create(
        tenant_id=uuid4(), user_id=uuid4(), endpoint=endpoint, p256dh="key", auth="secret"
    )


_MODULE = "prosell.infrastructure.services.web_push_notification_service"


class TestWebPushNotificationService:
    @pytest.mark.asyncio
    async def test_notify_sends_to_every_subscription(self):
        notification = make_notification()
        subscriptions = [make_subscription("https://a"), make_subscription("https://b")]
        repo = AsyncMock()
        repo.list_for_user.return_value = subscriptions

        with patch(f"{_MODULE}.webpush") as webpush_mock:
            service = WebPushNotificationService(
                subscription_repository=repo,
                vapid_private_key="fake-private-key",
                vapid_subject="mailto:admin@prosell.saas",
            )
            await service.notify(notification)

            assert webpush_mock.call_count == 2

    @pytest.mark.asyncio
    async def test_notify_noop_when_vapid_not_configured(self):
        notification = make_notification()
        repo = AsyncMock()

        with patch(f"{_MODULE}.webpush") as webpush_mock:
            service = WebPushNotificationService(
                subscription_repository=repo, vapid_private_key="", vapid_subject=""
            )
            await service.notify(notification)

            repo.list_for_user.assert_not_called()
            webpush_mock.assert_not_called()

    @pytest.mark.asyncio
    async def test_notify_deletes_expired_subscription_on_410(self):
        notification = make_notification()
        subscription = make_subscription("https://expired")
        repo = AsyncMock()
        repo.list_for_user.return_value = [subscription]

        response = MagicMock()
        response.status_code = 410

        with patch(f"{_MODULE}.webpush", side_effect=WebPushException("gone", response=response)):
            service = WebPushNotificationService(
                subscription_repository=repo,
                vapid_private_key="fake-private-key",
                vapid_subject="mailto:admin@prosell.saas",
            )
            await service.notify(notification)

        repo.delete_by_endpoint.assert_awaited_once_with(
            "https://expired", subscription.user_id, subscription.tenant_id
        )

    @pytest.mark.asyncio
    async def test_notify_never_raises_on_unexpected_error(self):
        notification = make_notification()
        subscription = make_subscription()
        repo = AsyncMock()
        repo.list_for_user.return_value = [subscription]

        with patch(f"{_MODULE}.webpush", side_effect=RuntimeError("network exploded")):
            service = WebPushNotificationService(
                subscription_repository=repo,
                vapid_private_key="fake-private-key",
                vapid_subject="mailto:admin@prosell.saas",
            )

            await service.notify(notification)  # must not raise
