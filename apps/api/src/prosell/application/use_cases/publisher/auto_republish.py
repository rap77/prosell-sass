"""AutoRepublishUseCase — detects expiring listings and creates replacements.

Design:

- Window: 48 hours before expiry (gives 8 scheduler runs per listing at 6h intervals)
- Pattern: clone -> expire old -> dispatch new (preserves audit trail)
- The old Publication becomes EXPIRED in history; new one has its own lifecycle.
"""

import logging

from prosell.domain.entities.publication import Publication
from prosell.domain.exceptions.publisher_exceptions import PublisherDomainError
from prosell.domain.ports.i_task_dispatcher import ITaskDispatcher
from prosell.domain.repositories.publication_repository import IPublicationRepository

logger = logging.getLogger(__name__)


class AutoRepublishUseCase:
    """Queries listings approaching 7-day expiry and creates replacement publications.

    FB Marketplace auto-expires listings after 7 days. This use case runs every 6h
    (via Taskiq scheduler) and clones each expiring listing into a new PENDING
    publication, then dispatches a publish task for it.
    """

    def __init__(
        self,
        publication_repo: IPublicationRepository,
        task_dispatcher: ITaskDispatcher,
    ) -> None:
        self._repo = publication_repo
        self._dispatcher = task_dispatcher

    async def execute(self) -> dict[str, int]:
        """Detect expiring listings and republish them.

        Returns:
            Dict with {"checked": N, "republished": M} stats.
        """
        expiring = await self._repo.get_approaching_expiry(hours_before=48)
        republished = 0

        for old_pub in expiring:
            try:
                # Clone content into new publication (new id, PENDING status by default)
                new_pub = Publication(
                    product_id=old_pub.product_id,
                    tenant_id=old_pub.tenant_id,
                    seller_user_id=old_pub.seller_user_id,
                    facebook_page_id=old_pub.facebook_page_id,
                    title=old_pub.title,
                    description=old_pub.description,
                    price_cents=old_pub.price_cents,
                    zip_code=old_pub.zip_code,
                    image_urls=list(old_pub.image_urls),
                    hero_shot_url=old_pub.hero_shot_url,
                )
                new_pub = await self._repo.create(new_pub)

                # Mark old as EXPIRED (audit trail preserved)
                old_pub.mark_expired()
                await self._repo.update(old_pub)

                await self._dispatcher.dispatch_publish(new_pub.id)

                republished += 1
            except PublisherDomainError:
                logger.exception("Failed to republish %s", old_pub.id)

        return {"checked": len(expiring), "republished": republished}
