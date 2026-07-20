"""PublishVehicleUseCase — creates Publication and dispatches Taskiq task.

Design:
  The use case is intentionally thin — it only validates input, creates the
  Publication record in PENDING state, and dispatches publish_product_task.

  Image downloading and processing happen inside the Taskiq task (not here),
  so the API request returns immediately without blocking on image downloads.

  Image lifecycle:
    1. publication.image_urls stores SOURCE URLs (validated by Pydantic, not fetched)
    2. publish_product_task downloads each URL with httpx
    3. Task processes bytes through ImagePipelineService (compress, resize, JPG, strip EXIF)
    4. Task passes processed bytes to service.publish(publication, token, image_bytes_list)
"""

from uuid import UUID

from prosell.application.dto.publisher.publish import PublicationResponse, PublishProductRequest
from prosell.domain.entities.publication import Publication
from prosell.domain.ports.i_task_dispatcher import ITaskDispatcher
from prosell.domain.repositories.publication_repository import IPublicationRepository


class PublishVehicleUseCase:
    """Creates a Publication record in PENDING state and dispatches publish_product_task.

    Does NOT process images — image downloading and processing happen in the task.
    Does NOT receive or store access tokens — task loads them from DB at execution time.
    """

    def __init__(
        self,
        publication_repo: IPublicationRepository,
        seller_user_id: UUID,
        seller_tenant_id: UUID,
        task_dispatcher: ITaskDispatcher,
    ) -> None:
        self._repo = publication_repo
        self._seller_user_id = seller_user_id
        self._seller_tenant_id = seller_tenant_id
        self._task_dispatcher = task_dispatcher

    async def execute(self, request: PublishProductRequest) -> PublicationResponse:
        """Create Publication record and dispatch Taskiq task.

        Args:
            request: PublishProductRequest DTO with listing content and source image URLs.

        Returns:
            PublicationResponse with id, product_id, and status="pending".
        """
        # Reorder image_urls so hero shot is at index 0
        ordered_urls = list(request.image_urls)
        if request.hero_shot_index > 0 and request.hero_shot_index < len(ordered_urls):
            hero = ordered_urls.pop(request.hero_shot_index)
            ordered_urls.insert(0, hero)

        # Create Publication record in PENDING state.
        # Stores SOURCE URLs — task handles downloading/processing.
        # tenant_id is derived from authenticated user, NEVER trusted from client payload.
        publication = Publication(
            product_id=request.product_id,
            tenant_id=self._seller_tenant_id,
            seller_user_id=self._seller_user_id,
            facebook_page_id=request.facebook_page_id,
            title=request.title,
            description=request.description,
            price_cents=request.price_cents,
            zip_code=request.zip_code,
            image_urls=ordered_urls,
            hero_shot_url=ordered_urls[0] if ordered_urls else None,
        )
        publication = await self._repo.create(publication)

        await self._task_dispatcher.dispatch_publish(publication.id)

        return PublicationResponse(
            id=publication.id,
            product_id=publication.product_id,
            status=publication.status.value,
        )
