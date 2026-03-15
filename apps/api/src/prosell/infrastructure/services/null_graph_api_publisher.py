"""NullGraphAPIPublisherService — Phase 1 placeholder until Graph API is approved.

Plan 01-06 replaces this with the real GraphAPIPublisherService once FB App Review
is complete. PublisherStrategySelector always returns Playwright when
settings.graph_api_approved is False, so this service is never actually called
in Phase 1 — it exists only to satisfy the interface.
"""

from prosell.domain.entities.publication import Publication
from prosell.domain.ports.i_publisher_service import IPublisherService


class NullGraphAPIPublisherService(IPublisherService):
    """Null object for Graph API publisher — raises NotImplementedError if invoked.

    Used by publish_vehicle_task in Phase 1 to satisfy PublisherStrategySelector's
    type requirements without pulling in the real Graph API implementation.
    The strategy selector will never select this service while graph_api_approved=False.
    """

    async def publish(
        self,
        publication: Publication,
        access_token: str,
        image_bytes_list: list[bytes],
    ) -> str:
        raise NotImplementedError("Graph API publisher not available in Phase 1")

    async def update(
        self,
        publication: Publication,
        access_token: str,
        image_bytes_list: list[bytes],
    ) -> None:
        raise NotImplementedError("Graph API publisher not available in Phase 1")

    async def delete(self, publication: Publication, access_token: str) -> None:
        raise NotImplementedError("Graph API publisher not available in Phase 1")
