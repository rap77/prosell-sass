"""delete_listing_task — remove a FB Marketplace listing (best-effort)."""

from prosell.infrastructure.tasks.broker import broker


@broker.task
async def delete_listing_task(publication_id: str) -> dict:
    """Remove FB Marketplace listing via publisher strategy.

    Note: Publication is already SOLD in DB when this task runs.
    This task is best-effort — if FB delete fails, the vehicle is
    still marked sold in ProSell (prevents double-selling).
    """
    from uuid import UUID

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
        if not publication or not publication.fb_listing_id:
            return {"status": "skipped", "reason": "no fb_listing_id"}

        page = await page_repo.get_by_id(publication.facebook_page_id)
        if not page:
            return {"error": "FacebookPage not found"}
        access_token = encryption.decrypt(page.page_access_token_encrypted)

        playwright_svc = PlaywrightPublisherService()
        graph_api_svc = GraphAPIPublisherService(encryption)
        selector = PublisherStrategySelector(playwright_svc, graph_api_svc)
        service, _ = selector.select()

        try:
            await service.delete(publication, access_token)
            return {"status": "deleted", "fb_listing_id": publication.fb_listing_id}
        except Exception as exc:
            # Best-effort: log but don't fail — publication is already SOLD in DB
            return {"status": "fb_delete_failed", "error": str(exc)}
