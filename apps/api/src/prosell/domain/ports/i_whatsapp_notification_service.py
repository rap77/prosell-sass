"""WhatsApp notification service port (secondary interface).

CRM roadmap Fase 5 delivery channel — deliberately provider-agnostic.
No concrete adapter exists yet (Twilio vs. Meta WhatsApp Business Cloud
API is still an open decision, see docs/twenty-crm-adoption.md "Deuda
técnica pendiente"); `LoggingWhatsAppNotificationService` is the only
implementation today, mirroring the email port's `LoggingSender`
fail-safe pattern. Best-effort by contract, same as the push port: a
delivery failure must never raise.
"""

from abc import abstractmethod
from collections.abc import Awaitable
from typing import Protocol

from prosell.domain.entities.notification import Notification


class AbstractWhatsAppNotificationService(Protocol):
    """
    WhatsApp notification service interface.

    This is a secondary port in Clean Architecture.
    The infrastructure layer implements this adapter.
    """

    @abstractmethod
    def notify(self, notification: Notification) -> Awaitable[None]:
        """Deliver a notification via WhatsApp to the notification's
        user. Never raises."""
        ...
