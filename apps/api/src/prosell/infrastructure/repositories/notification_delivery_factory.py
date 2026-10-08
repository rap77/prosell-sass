"""build_delivering_notification_repository — single wiring point for
notification delivery (push + WhatsApp on top of the in-app row).

CRM roadmap Fase 5. Both real call sites that create a Notification
(`CreateLeadUseCase` via lead_router.py, `NotifyStaleLeadsUseCase` via
notify_stale_leads_task.py) go through this factory instead of
constructing `SqlAlchemyNotificationRepository` directly — adding a
channel or changing how one is configured happens here, once.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from prosell.core.config import settings
from prosell.infrastructure.repositories.delivering_notification_repository import (
    DeliveringNotificationRepository,
)
from prosell.infrastructure.repositories.notification_repository_impl import (
    SqlAlchemyNotificationRepository,
)
from prosell.infrastructure.repositories.push_subscription_repository_impl import (
    SqlAlchemyPushSubscriptionRepository,
)
from prosell.infrastructure.services.logging_whatsapp_notification_service import (
    LoggingWhatsAppNotificationService,
)
from prosell.infrastructure.services.notification_delivery_dispatcher import (
    NotificationDeliveryDispatcher,
)
from prosell.infrastructure.services.web_push_notification_service import (
    WebPushNotificationService,
)


def build_delivering_notification_repository(
    session: AsyncSession,
) -> DeliveringNotificationRepository:
    """Build a notification repository that persists in-app AND fans out
    to every secondary delivery channel on create()."""
    push_service = WebPushNotificationService(
        subscription_repository=SqlAlchemyPushSubscriptionRepository(session),
        vapid_private_key=settings.vapid_private_key,
        vapid_subject=settings.vapid_subject,
    )
    whatsapp_service = LoggingWhatsAppNotificationService()
    dispatcher = NotificationDeliveryDispatcher(
        push_service=push_service, whatsapp_service=whatsapp_service
    )
    return DeliveringNotificationRepository(
        inner=SqlAlchemyNotificationRepository(session),
        dispatcher=dispatcher,
    )
