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
        """Enqueue a publish_vehicle_task for the given publication.

        Raises:
            TaskDispatchError: If Taskiq fails to enqueue the task.
        """
        try:
            # Lazy import: broker and task modules must not be imported at module level
            # to avoid Taskiq client initialization during test collection.
            from prosell.infrastructure.tasks.use_cases.publish_vehicle_task import (
                publish_vehicle_task,
            )

            await publish_vehicle_task.kiq(publication_id=str(publication_id))
        except Exception as exc:
            raise TaskDispatchError(
                publication_id=str(publication_id),
                reason=str(exc),
            ) from exc
