"""WebPushNotificationService — Web Push implementation of the push port.

CRM roadmap Fase 5 delivery channel. Uses the open Web Push standard
(VAPID) directly via `pywebpush` — no third-party account, no
Firebase/APNs dependency, free at any volume.
"""

import asyncio
import json
import logging

from pywebpush import WebPushException, webpush

from prosell.domain.entities.notification import Notification
from prosell.domain.repositories.push_subscription_repository import (
    AbstractPushSubscriptionRepository,
)

logger = logging.getLogger(__name__)

_EXPIRED_STATUS_CODES = {404, 410}


class WebPushNotificationService:
    """Web Push implementation of AbstractPushNotificationService."""

    def __init__(
        self,
        subscription_repository: AbstractPushSubscriptionRepository,
        vapid_private_key: str,
        vapid_subject: str,
    ) -> None:
        self._subscription_repository = subscription_repository
        self._vapid_private_key = vapid_private_key
        self._vapid_subject = vapid_subject

    async def notify(self, notification: Notification) -> None:
        """Deliver to every subscription for this notification's user.

        Best-effort: a per-subscription failure is logged and skipped,
        never raised. Fails fast (no-op) if VAPID isn't configured —
        same fail-safe shape as the email port's `LoggingSender` fallback.
        """
        if not self._vapid_private_key:
            logger.info("Push not configured (no VAPID private key) - skipping delivery.")
            return

        subscriptions = await self._subscription_repository.list_for_user(
            notification.user_id, notification.tenant_id
        )
        payload = json.dumps(
            {
                "title": notification.title,
                "body": notification.body,
                "resource_type": notification.resource_type,
                "resource_id": str(notification.resource_id) if notification.resource_id else None,
            }
        )

        for subscription in subscriptions:
            try:
                await asyncio.to_thread(
                    webpush,
                    subscription_info={
                        "endpoint": subscription.endpoint,
                        "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                    },
                    data=payload,
                    vapid_private_key=self._vapid_private_key,
                    vapid_claims={"sub": self._vapid_subject},
                )
            except WebPushException as exc:
                status_code = exc.response.status_code if exc.response is not None else None
                if status_code in _EXPIRED_STATUS_CODES:
                    await self._subscription_repository.delete_by_endpoint(
                        subscription.endpoint, subscription.user_id, subscription.tenant_id
                    )
                else:
                    logger.warning(
                        "Push delivery failed for endpoint %s: %s",
                        subscription.endpoint,
                        exc,
                    )
            except Exception:  # best-effort channel, never propagate
                logger.exception(
                    "Unexpected error delivering push to endpoint %s", subscription.endpoint
                )
