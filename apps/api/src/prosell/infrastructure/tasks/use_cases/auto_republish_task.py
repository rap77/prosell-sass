"""Scheduled Taskiq task for auto-republish of expiring FB Marketplace listings.

Scheduled to run every 6 hours (same cadence as token refresh).
Rationale: 7-day FB post expiry with 48h warning window gives 8 scheduler
runs per listing — sufficient redundancy if one run is missed.
"""

from prosell.infrastructure.tasks.broker import broker


@broker.task
async def auto_republish_task() -> dict[str, int]:
    """Detect listings approaching 7-day expiry and republish them.

    Runs every 6 hours via Taskiq scheduler (cron configuration in worker.py).
    Uses manual DI (not FastAPI Depends) — task runs in worker process.
    """
    from prosell.application.use_cases.publisher.auto_republish import AutoRepublishUseCase
    from prosell.infrastructure.database.session import async_session_maker
    from prosell.infrastructure.repositories.publication_repository_impl import (
        SqlAlchemyPublicationRepository,
    )
    from prosell.infrastructure.tasks.taskiq_task_dispatcher import TaskiqTaskDispatcher

    async with async_session_maker() as session:
        pub_repo = SqlAlchemyPublicationRepository(session)
        dispatcher = TaskiqTaskDispatcher()
        use_case = AutoRepublishUseCase(publication_repo=pub_repo, task_dispatcher=dispatcher)
        result = await use_case.execute()
        return result
