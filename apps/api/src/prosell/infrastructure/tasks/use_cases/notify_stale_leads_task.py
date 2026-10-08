"""Scheduled Taskiq task: notify vendedores of leads with no recent activity.

CRM roadmap Fase 5 ("Twenty concept: Automations", hardcoded trigger).
Schedule is configured via `settings.notify_stale_leads_cron` — same
pattern as `prune_sold_galleries_task.py` (schedule resolved once at
task-decorator-evaluation time; changing it requires a worker restart).

Uses manual DI (not FastAPI Depends) — the task runs in the worker process.
"""

from prosell.core.config import settings
from prosell.infrastructure.tasks.broker import broker


def _notify_stale_leads_schedule() -> list[dict]:
    """Build the schedule payload from settings (read at task import time)."""
    return [{"cron": settings.notify_stale_leads_cron}]


@broker.task(schedule=_notify_stale_leads_schedule())
async def notify_stale_leads_task() -> dict[str, int]:
    """Notify each stale lead's assigned vendedor (in-app only).

    Runs on the cron configured in settings. Returns
    {"leads_notified": int}.
    """
    from prosell.application.use_cases.lead.notify_stale_leads import NotifyStaleLeadsUseCase
    from prosell.infrastructure.database.session import async_session_maker
    from prosell.infrastructure.repositories.lead_repository_impl import (
        SqlAlchemyLeadRepository,
    )
    from prosell.infrastructure.repositories.notification_delivery_factory import (
        build_delivering_notification_repository,
    )

    async with async_session_maker() as session:
        use_case = NotifyStaleLeadsUseCase(
            SqlAlchemyLeadRepository(session),
            build_delivering_notification_repository(session),
        )
        leads_notified = await use_case.execute(stale_after_days=settings.stale_lead_days)
        await session.commit()
    return {"leads_notified": leads_notified}
