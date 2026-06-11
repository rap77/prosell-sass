"""Scheduled Taskiq task: prune long-sold products' galleries to the cover only.

Scheduled to run daily via the Taskiq scheduler (cron configuration in worker.py).
Uses manual DI (not FastAPI Depends) — the task runs in the worker process.
Frees DigitalOcean Spaces storage by deleting non-cover images of products that
have stayed SOLD past the grace period.
"""

from prosell.infrastructure.tasks.broker import broker


@broker.task
async def prune_sold_galleries_task() -> dict[str, int]:
    """Delete non-cover images of products SOLD past the grace period.

    Runs daily via the Taskiq scheduler. Returns prune statistics
    ({"products_pruned": int, "images_deleted": int}).
    """
    from prosell.application.use_cases.product.prune_sold_product_images import (
        PruneSoldProductImagesUseCase,
    )
    from prosell.core.config import settings
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
