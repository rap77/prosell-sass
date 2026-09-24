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

    @abstractmethod
    async def dispatch_update(self, publication_id: UUID) -> None:
        """Enqueue an update task for the given publication."""
        pass

    @abstractmethod
    async def dispatch_delete(self, publication_id: UUID) -> None:
        """Enqueue a delete task for the given publication."""
        pass

    @abstractmethod
    async def dispatch_cdn_purge(self, key: str) -> None:
        """Enqueue a CDN cache-invalidation retry for `key`.

        Called when the synchronous purge fails so the request handler
        can return 2xx to the client while ops gets the cache evicted
        via the worker (NFR3.1, NFR3.2). Idempotent: the task re-runs
        the same purge call, which is safe to repeat.
        """
        pass
