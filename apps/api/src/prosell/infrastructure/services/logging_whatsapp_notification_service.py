"""LoggingWhatsAppNotificationService — safe no-op WhatsApp adapter.

CRM roadmap Fase 5 delivery channel. Placeholder implementation of
AbstractWhatsAppNotificationService until a real provider is chosen
(Twilio vs. Meta WhatsApp Business Cloud API — open decision, see
docs/twenty-crm-adoption.md "Deuda técnica pendiente"). Mirrors the
email port's `LoggingSender`: logs what would have been sent, never
raises, never requires credentials to exist.

Whoever builds the real adapter also needs to resolve where the
recipient's WhatsApp number comes from — `User` has no phone field
today, so that's a design decision for that work, not something this
placeholder can answer.
"""

import logging

from prosell.domain.entities.notification import Notification

logger = logging.getLogger(__name__)


class LoggingWhatsAppNotificationService:
    """No-op implementation of AbstractWhatsAppNotificationService."""

    async def notify(self, notification: Notification) -> None:
        """Log what a real adapter would have sent. Never raises."""
        logger.info(
            "WhatsApp delivery not configured - would send notification %s "
            "(type=%s, user_id=%s, title=%r) once a provider is wired.",
            notification.id,
            notification.notification_type,
            notification.user_id,
            notification.title,
        )
