"""DeleteListingUseCase — mark vehicle sold and remove FB Marketplace listing."""

from uuid import UUID

from prosell.application.dto.publisher.publish import PublicationResponse
from prosell.domain.ports.i_task_dispatcher import ITaskDispatcher
from prosell.domain.repositories.publication_repository import IPublicationRepository


class DeleteListingUseCase:
    """Mark a publication as SOLD and dispatch FB listing removal.

    DB is marked SOLD before dispatching the task (source of truth).
    FB delete is best-effort — if it fails, ProSell still shows the vehicle as sold,
    which prevents double-selling. A stale listing on FB for a sold vehicle is
    less harmful than ProSell showing an active listing for a sold vehicle.
    """

    def __init__(
        self,
        publication_repo: IPublicationRepository,
        task_dispatcher: ITaskDispatcher,
    ) -> None:
        self._repo = publication_repo
        self._task_dispatcher = task_dispatcher

    async def execute(
        self,
        publication_id: UUID,
        tenant_id: UUID,
    ) -> PublicationResponse:
        publication = await self._repo.get_by_id(publication_id, tenant_id=tenant_id)
        if not publication:
            raise ValueError(f"Publication {publication_id} not found")

        # Mark SOLD in DB immediately (before FB delete — FB delete is best-effort)
        publication.mark_sold()
        await self._repo.update(publication)

        await self._task_dispatcher.dispatch_delete(publication_id)

        return PublicationResponse(
            id=publication.id,
            product_id=publication.product_id,
            status=publication.status.value,
            fb_listing_id=publication.fb_listing_id,
        )
