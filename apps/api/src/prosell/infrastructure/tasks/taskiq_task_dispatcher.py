"""TaskiqTaskDispatcher — ITaskDispatcher adapter backed by Taskiq broker.

Infrastructure adapter that dispatches background tasks via the Taskiq broker.
Keeps application use cases decoupled from Taskiq/infrastructure internals.
"""

from uuid import UUID

from prosell.domain.exceptions.publisher_exceptions import TaskDispatchError
from prosell.domain.ports.i_task_dispatcher import ITaskDispatcher


class TaskiqTaskDispatcher(ITaskDispatcher):
    """Implements ITaskDispatcher by enqueuing tasks through Taskiq broker."""

    async def dispatch_publish(self, publication_id: UUID) -> None:
        """Enqueue a publish_product_task for the given publication.

        Raises:
            TaskDispatchError: If Taskiq fails to enqueue the task.
        """
        try:
            # Lazy import: broker and task modules must not be imported at module level
            # to avoid Taskiq client initialization during test collection.
            from prosell.infrastructure.tasks.use_cases.publish_product_task import (
                publish_product_task,
            )

            await publish_product_task.kiq(publication_id=str(publication_id))
        except Exception as exc:
            raise TaskDispatchError(
                publication_id=str(publication_id),
                reason=str(exc),
            ) from exc

    async def dispatch_update(self, publication_id: UUID) -> None:
        """Enqueue an update_listing_task for the given publication."""
        try:
            from prosell.infrastructure.tasks.use_cases.update_listing_task import (
                update_listing_task,
            )

            await update_listing_task.kiq(publication_id=str(publication_id))
        except Exception as exc:
            raise TaskDispatchError(
                publication_id=str(publication_id),
                reason=str(exc),
            ) from exc

    async def dispatch_delete(self, publication_id: UUID) -> None:
        """Enqueue a delete_listing_task for the given publication."""
        try:
            from prosell.infrastructure.tasks.use_cases.delete_listing_task import (
                delete_listing_task,
            )

            await delete_listing_task.kiq(publication_id=str(publication_id))
        except Exception as exc:
            raise TaskDispatchError(
                publication_id=str(publication_id),
                reason=str(exc),
            ) from exc

    async def dispatch_cdn_purge(self, key: str) -> None:
        """Enqueue a purge_cdn_cache_task for the given storage key.

        Used as the compensation hook when a synchronous CDN purge
        fails (NFR3.1, NFR3.2, FR4.4). The task body is the same
        invalidation call, so re-running it is idempotent on the CDN
        side.
        """
        try:
            from prosell.infrastructure.tasks.use_cases.purge_cdn_cache_task import (
                purge_cdn_cache_task,
            )

            await purge_cdn_cache_task.kiq(key=key)
        except Exception as exc:
            raise TaskDispatchError(
                publication_id=f"cdn:{key}",
                reason=str(exc),
            ) from exc
