"""UpdateListingUseCase — update price/description on an active FB Marketplace listing."""

from datetime import UTC, datetime
from uuid import UUID

from pydantic import Field

from prosell.application.dto.publisher.publish import PublicationResponse
from prosell.domain.base import DomainModel
from prosell.domain.ports.i_task_dispatcher import ITaskDispatcher
from prosell.domain.repositories.publication_repository import IPublicationRepository


class UpdateListingRequest(DomainModel):
    """Input DTO for UpdateListingUseCase."""

    publication_id: UUID
    title: str | None = None
    description: str | None = None
    price_cents: int | None = Field(default=None, gt=0)


class UpdateListingUseCase:
    """Update price and/or description on an existing PUBLISHED FB Marketplace listing.

    Validates publication is PUBLISHED before applying changes.
    Dispatches update_listing_task to propagate updates to Facebook.
    """

    def __init__(
        self,
        publication_repo: IPublicationRepository,
        task_dispatcher: ITaskDispatcher,
    ) -> None:
        self._repo = publication_repo
        self._task_dispatcher = task_dispatcher

    async def execute(self, request: UpdateListingRequest) -> PublicationResponse:
        publication = await self._repo.get_by_id(request.publication_id)
        if not publication:
            raise ValueError(f"Publication {request.publication_id} not found")
        if publication.status.value != "published":
            raise ValueError("Cannot update a non-published listing")

        # Apply updates
        if request.title is not None:
            publication.title = request.title
        if request.description is not None:
            publication.description = request.description
        if request.price_cents is not None:
            publication.price_cents = request.price_cents

        publication.updated_at = datetime.now(UTC)
        await self._repo.update(publication)

        await self._task_dispatcher.dispatch_update(publication.id)

        return PublicationResponse(
            id=publication.id,
            product_id=publication.product_id,
            status=publication.status.value,
            fb_listing_id=publication.fb_listing_id,
        )
