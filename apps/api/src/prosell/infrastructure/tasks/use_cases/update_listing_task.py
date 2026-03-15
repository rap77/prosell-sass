"""update_listing_task — propagate listing content updates to Facebook Marketplace."""

from prosell.infrastructure.tasks.broker import broker


@broker.task
async def update_listing_task(publication_id: str) -> dict:
    """Update existing FB Marketplace listing via publisher strategy.

    Same DI pattern as publish_vehicle_task and delete_listing_task:
    - Receives only publication_id (never tokens in task payload)
    - Instantiates its own service dependencies (not FastAPI DI)
    - Updates publication.updated_at on success
    - On Category B failure (captcha/ban): sets blocked_until_confirmed=True
    - On Category A failure (transient): returns error for caller to handle retry
    """
    from uuid import UUID

    from prosell.domain.entities.publication import PublicationErrorCategory
    from prosell.infrastructure.database.session import async_session_factory
    from prosell.infrastructure.repositories.facebook_page_repository_impl import (
        SqlAlchemyFacebookPageRepository,
    )
    from prosell.infrastructure.repositories.publication_repository_impl import (
        SqlAlchemyPublicationRepository,
    )
    from prosell.infrastructure.services.graph_api_publisher import GraphAPIPublisherService
    from prosell.infrastructure.services.playwright_publisher import PlaywrightPublisherService
    from prosell.infrastructure.services.publisher_strategy import PublisherStrategySelector
    from prosell.infrastructure.services.token_encryption_service import TokenEncryptionService

    pub_id = UUID(publication_id)

    async with async_session_factory() as session:
        pub_repo = SqlAlchemyPublicationRepository(session)
        page_repo = SqlAlchemyFacebookPageRepository(session)
        encryption = TokenEncryptionService()

        publication = await pub_repo.get_by_id(pub_id)
        if not publication:
            return {"error": f"Publication {publication_id} not found"}

        if not publication.fb_listing_id:
            return {"status": "skipped", "reason": "no fb_listing_id — listing was never published"}

        # Category B lock — never retry if blocked
        if publication.blocked_until_confirmed:
            return {"status": "blocked", "publication_id": publication_id}

        page = await page_repo.get_by_id(publication.facebook_page_id)
        if not page:
            return {"error": f"FacebookPage {publication.facebook_page_id} not found"}
        access_token = encryption.decrypt(page.page_access_token_encrypted)

        playwright_svc = PlaywrightPublisherService()
        graph_api_svc = GraphAPIPublisherService(encryption)
        selector = PublisherStrategySelector(playwright_svc, graph_api_svc)
        service, engine_name = selector.select()

        try:
            # image_bytes_list=[] — images already stored in DO Spaces, referenced via image_urls.
            # Publisher service re-downloads from those URLs.
            await service.update(publication, access_token, [])

            from datetime import UTC, datetime

            publication.updated_at = datetime.now(UTC)
            await pub_repo.update(publication)

            return {
                "status": "updated",
                "fb_listing_id": publication.fb_listing_id,
                "engine": engine_name,
            }

        except Exception as exc:
            err_str = str(exc).lower()
            if "captcha" in err_str or "checkpoint" in err_str or "ban" in err_str:
                # Category B — block queue for this seller
                publication.mark_failed(PublicationErrorCategory.B, str(exc))
                await pub_repo.update(publication)
                return {"status": "failed", "category": "B", "error": str(exc)}
            else:
                # Category A — transient, caller decides retry
                return {"status": "failed", "category": "A", "error": str(exc)}
