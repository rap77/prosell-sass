"""PushSubscription entity - a browser Web Push subscription.

CRM roadmap Fase 5 ("Automations" delivery channel). Independent of
WhatsApp/in-app channels: one user can hold several subscriptions (one
per browser/device), each identified by its unique `endpoint`.
"""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from prosell.domain.base import Field, ValueObject


class PushSubscription(ValueObject):
    """
    Web Push subscription entry.

    Immutable, mirrors the Web Push API's PushSubscription shape
    (endpoint + keys) — once created, never changes. Re-subscribing with
    the same endpoint is an upsert at the repository level, not a mutation
    here.
    """

    id: UUID
    tenant_id: UUID
    user_id: UUID

    endpoint: str
    p256dh: str
    auth: str

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        tenant_id: UUID,
        user_id: UUID,
        endpoint: str,
        p256dh: str,
        auth: str,
    ) -> "PushSubscription":
        """Factory method for creating a new subscription entry."""
        return cls(
            id=uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            created_at=datetime.now(UTC),
        )
