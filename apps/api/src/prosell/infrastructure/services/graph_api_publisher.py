"""Graph API publisher service (stub for Phase 1).

Full implementation pending Facebook App Review approval.
The stub exists so PublisherStrategySelector can import and instantiate it.
In 'auto' mode with graph_api_approved=False, this service is never called.
"""

from prosell.domain.entities.publication import Publication
from prosell.domain.ports.i_encryption_service import IEncryptionService
from prosell.domain.ports.i_publisher_service import IPublisherService


class GraphAPIPublisherService(IPublisherService):
    """Facebook Graph API publisher.

    Phase 1 status: STUB — raises NotImplementedError.
    Full implementation in Phase 1.5/2 after FB App Review approval.

    When approved, this service uses the facebook-sdk to call:
    - POST /{page-id}/marketplace_listings (create listing)
    - POST /{listing-id} (update listing)
    - DELETE /{listing-id} (remove listing)
    """

    def __init__(self, encryption_service: IEncryptionService | None) -> None:
        self._encryption = encryption_service

    async def publish(
        self,
        publication: Publication,
        access_token: str,
        image_bytes_list: list[bytes],
    ) -> str:
        raise NotImplementedError(
            "GraphAPIPublisherService.publish() requires Facebook Graph API App Review approval. "
            "Set PUBLISHER_ENGINE=playwright or wait for App Review completion."
        )

    async def update(
        self,
        publication: Publication,
        access_token: str,
        image_bytes_list: list[bytes],
    ) -> None:
        raise NotImplementedError(
            "GraphAPIPublisherService.update() requires Facebook Graph API App Review approval."
        )

    async def delete(self, publication: Publication, access_token: str) -> None:
        raise NotImplementedError(
            "GraphAPIPublisherService.delete() requires Facebook Graph API App Review approval."
        )
