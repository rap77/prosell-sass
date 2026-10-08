"""NotifyStaleLeadsUseCase — in-app reminder for leads with no activity.

CRM roadmap Fase 5 ("Twenty concept: Automations", hardcoded trigger —
"Lead sin actividad en 3 días"). Notification channel is in-app only
(reuses the existing Notification entity/repository) — push and
WhatsApp Business API were explicitly deferred (no infra for either
exists in this project yet).
"""

from datetime import UTC, datetime, timedelta

from prosell.domain.entities.lead import LeadStatus
from prosell.domain.entities.notification import Notification, NotificationType
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.notification_repository import AbstractNotificationRepository


class NotifyStaleLeadsUseCase:
    """
    Notify each stale lead's assigned vendedor, then reset its staleness
    clock (`touch()`) so the next run doesn't re-notify for the same
    inactivity window — idempotent by construction, same discipline as
    PruneSoldProductImagesUseCase ("already pruned" is a repo-derived
    state, not a separate tracking row).

    Business rules:
    - "Stale" = no update (status change, activity logged) in
      `stale_after_days` days.
    - LOST leads are excluded — terminal, no follow-up expected.
    - Unassigned leads (vendedor_id is None) are skipped — no one to
      notify.
    """

    def __init__(
        self,
        lead_repository: AbstractLeadRepository,
        notification_repository: AbstractNotificationRepository,
    ) -> None:
        self._leads = lead_repository
        self._notifications = notification_repository

    async def execute(self, stale_after_days: int = 3) -> int:
        cutoff = datetime.now(UTC) - timedelta(days=stale_after_days)
        stale_leads = await self._leads.list_stale(
            before=cutoff, exclude_statuses=[LeadStatus.LOST]
        )

        notified = 0
        for lead in stale_leads:
            if lead.vendedor_id is None:
                continue

            notification = Notification.create(
                tenant_id=lead.tenant_id,
                user_id=lead.vendedor_id,
                notification_type=NotificationType.LEAD_STALE_NO_ACTIVITY,
                title="Lead sin seguimiento",
                body=(f"{lead.buyer_name} no tiene actividad hace {stale_after_days} días o más."),
                resource_type="lead",
                resource_id=lead.id,
            )
            await self._notifications.create(notification)
            await self._leads.touch(lead.id, lead.tenant_id)
            notified += 1

        return notified
