"""ITaskDispatcher — Port for dispatching background tasks.

Decouples application use cases from Taskiq/infrastructure task queue.
"""

from abc import ABC, abstractmethod
from uuid import UUID


class ITaskDispatcher(ABC):
    """Port for dispatching background publish tasks.

    Adapters implement this for specific queuing backends (Taskiq, Celery, etc.).
    Use cases depend on this abstraction — never on concrete task implementations.
    """

    @abstractmethod
    async def dispatch_publish(self, publication_id: UUID) -> None:
        """Enqueue a publish task for the given publication.

        Args:
            publication_id: ID of the Publication entity to publish.
        """
        pass
