"""Push notification service port (secondary interface).

CRM roadmap Fase 5 delivery channel. Best-effort by contract: a failure
delivering to one or all subscriptions must never raise — the in-app
`Notification` row (already persisted by the time this runs) is the
source of truth, push is a convenience on top of it.
"""

from abc import abstractmethod
from collections.abc import Awaitable
from typing import Protocol

from prosell.domain.entities.notification import Notification


class AbstractPushNotificationService(Protocol):
    """
    Push notification service interface.

    This is a secondary port in Clean Architecture.
    The infrastructure layer implements this adapter.
    """

    @abstractmethod
    def notify(self, notification: Notification) -> Awaitable[None]:
        """Deliver a notification via Web Push to every subscription the
        notification's user has registered. Never raises."""
        ...
