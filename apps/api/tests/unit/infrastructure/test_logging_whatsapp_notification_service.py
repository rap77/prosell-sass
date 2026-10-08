"""Unit tests for LoggingWhatsAppNotificationService - TDD RED phase.

CRM roadmap Fase 5 delivery channel. No real WhatsApp provider is wired
yet (Twilio vs. Meta Cloud API is still an open decision) — this is the
only implementation of AbstractWhatsAppNotificationService today,
mirroring the email port's LoggingSender fail-safe pattern: it never
raises, it just logs that a real adapter would have fired here.
"""

import logging
from uuid import uuid4

import pytest

from prosell.domain.entities.notification import Notification, NotificationType
from prosell.infrastructure.services.logging_whatsapp_notification_service import (
    LoggingWhatsAppNotificationService,
)


def make_notification() -> Notification:
    return Notification.create(
        tenant_id=uuid4(),
        user_id=uuid4(),
        notification_type=NotificationType.LEAD_STALE_NO_ACTIVITY,
        title="Lead sin actividad",
        body="Juan Perez no tiene actividad hace 3 dias",
    )


class TestLoggingWhatsAppNotificationService:
    @pytest.mark.asyncio
    async def test_notify_logs_and_never_raises(self, caplog):
        notification = make_notification()
        service = LoggingWhatsAppNotificationService()

        with caplog.at_level(logging.INFO):
            await service.notify(notification)  # must not raise

        assert any(
            str(notification.id) in record.message or str(notification.id) in record.getMessage()
            for record in caplog.records
        )
