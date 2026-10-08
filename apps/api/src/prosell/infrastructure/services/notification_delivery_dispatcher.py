"""NotificationDeliveryDispatcher — fans a Notification out to every
secondary delivery channel (push, WhatsApp, ...).

CRM roadmap Fase 5. The single call site (`DeliveringNotificationRepository`)
stays unaware of how many channels exist or whether any is wired to a
real provider — adding a new channel means adding one constructor
parameter here, nothing upstream changes.
"""

import logging

from prosell.domain.entities.notification import Notification
from prosell.domain.ports.i_push_notification_service import AbstractPushNotificationService
from prosell.domain.ports.i_whatsapp_notification_service import (
    AbstractWhatsAppNotificationService,
)

logger = logging.getLogger(__name__)


class NotificationDeliveryDispatcher:
    """Best-effort fan-out across every secondary notification channel."""

    def __init__(
        self,
        push_service: AbstractPushNotificationService,
        whatsapp_service: AbstractWhatsAppNotificationService,
    ) -> None:
        self._push_service = push_service
        self._whatsapp_service = whatsapp_service

    async def deliver(self, notification: Notification) -> None:
        """Deliver to every channel. Never raises — each channel's own
        implementation already promises best-effort delivery, but this
        guards defensively in case a future channel doesn't."""
        for channel_name, service in (
            ("push", self._push_service),
            ("whatsapp", self._whatsapp_service),
        ):
            try:
                await service.notify(notification)
            except Exception:  # best-effort fan-out, never propagate
                logger.exception(
                    "Notification delivery channel %s failed for notification %s",
                    channel_name,
                    notification.id,
                )
