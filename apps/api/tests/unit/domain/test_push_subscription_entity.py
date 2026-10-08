"""Unit tests for PushSubscription entity - TDD RED phase.

CRM roadmap Fase 5 ("Automations" delivery channel) — a browser Web Push
subscription (endpoint + keys), independent of WhatsApp/in-app channels.
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.push_subscription import PushSubscription


class TestPushSubscriptionEntity:
    """Test PushSubscription entity."""

    def test_subscription_creation(self):
        subscription = PushSubscription.create(
            tenant_id=uuid4(),
            user_id=uuid4(),
            endpoint="https://fcm.googleapis.com/fcm/send/abc123",
            p256dh="BNcRd...key",
            auth="tBHI...secret",
        )

        assert subscription.id is not None
        assert subscription.tenant_id is not None
        assert subscription.user_id is not None
        assert subscription.endpoint == "https://fcm.googleapis.com/fcm/send/abc123"
        assert subscription.p256dh == "BNcRd...key"
        assert subscription.auth == "tBHI...secret"
        assert subscription.created_at is not None

    def test_subscription_immutability(self):
        """PushSubscription is a ValueObject (frozen) — once created, never changes."""
        subscription = PushSubscription.create(
            tenant_id=uuid4(),
            user_id=uuid4(),
            endpoint="https://fcm.googleapis.com/fcm/send/abc123",
            p256dh="BNcRd...key",
            auth="tBHI...secret",
        )

        with pytest.raises(Exception):  # noqa: B017 - Pydantic ValidationError
            subscription.endpoint = "https://other.endpoint"
