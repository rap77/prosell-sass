"""Scheduled Taskiq task: prune long-sold products' galleries to the cover only.

Schedule is configured via settings (`prune_sold_galleries_cron` /
`prune_sold_galleries_tz`) — the worker reads them at task-decorator-evaluation
time and mounts the resulting schedule on this task via the Taskiq scheduler
(LabelScheduleSource).

Uses manual DI (not FastAPI Depends) — the task runs in the worker process.
Frees DigitalOcean Spaces storage by deleting non-cover images of products that
have stayed SOLD past the grace period.
"""

from prosell.core.config import settings
from prosell.infrastructure.tasks.broker import broker


def _prune_schedule() -> list[dict]:
    """Build the schedule payload from settings (read at task import time).

    Taskiq reads `schedule` once at task-decorator-evaluation, so we resolve
    settings here. Settings are cached via lru_cache so this is a one-shot
    at import. If ops want to change the cron, they redeploy (or restart
    the worker) — by design.
    """
    entry: dict = {"cron": settings.prune_sold_galleries_cron}
    offset = settings.prune_sold_galleries_cron_offset
    if offset is not None:
        # Taskiq accepts a string like "+02:00" or a timedelta.
        entry["cron_offset"] = offset
    return [entry]


@broker.task(schedule=_prune_schedule())
async def prune_sold_galleries_task() -> dict[str, int]:
    """Delete non-cover images of products SOLD past the grace period.

    Runs on the cron configured in settings. Returns prune statistics
    ({"products_pruned": int, "images_deleted": int}).
    """
    from prosell.application.use_cases.product.prune_sold_product_images import (
        PruneSoldProductImagesUseCase,
    )
    from prosell.infrastructure.database.session import async_session_maker
    from prosell.infrastructure.repositories.product_repository_impl import (
        SqlAlchemyProductRepository,
    )
    from prosell.infrastructure.services.do_spaces_service import DOSpacesService

    async with async_session_maker() as session:
        use_case = PruneSoldProductImagesUseCase(
            SqlAlchemyProductRepository(session),
            DOSpacesService(),
            grace_days=settings.sold_image_grace_days,
        )
        summary = await use_case.execute()
        await session.commit()
    return summary
