"""update_listing_task — propagate listing content updates to Facebook Marketplace."""

from typing import TypedDict

from prosell.infrastructure.tasks.broker import broker


class UpdateListingTaskResult(TypedDict, total=False):
    """Result shape for update_listing_task — fields populated vary by branch
    (error/skipped/blocked/updated/failed), so all are optional."""

    error: str
    status: str
    reason: str
    publication_id: str
    fb_listing_id: str
    engine: str
    category: str


@broker.task
async def update_listing_task(publication_id: str) -> UpdateListingTaskResult:
    """Update existing FB Marketplace listing via publisher strategy.

    Same DI pattern as publish_product_task and delete_listing_task:
    - Receives only publication_id (never tokens in task payload)
    - Instantiates its own service dependencies (not FastAPI DI)
    - Updates publication.updated_at on success
    - On Category B failure (captcha/ban): sets blocked_until_confirmed=True
    - On Category A failure (transient): returns error for caller to handle retry
    """
    import os
    from uuid import UUID

    from prosell.domain.entities.publication import PublicationErrorCategory
    from prosell.domain.services.publisher_error_classifier import (
        classify_publisher_error,
        scrub_secret,
    )
    from prosell.infrastructure.database.session import async_session_maker
    from prosell.infrastructure.repositories.facebook_page_repository_impl import (
        SqlAlchemyFacebookPageRepository,
    )
    from prosell.infrastructure.repositories.publication_repository_impl import (
        SqlAlchemyPublicationRepository,
    )
    from prosell.infrastructure.services.publisher_strategy import build_publisher_selector
    from prosell.infrastructure.services.token_encryption_service import (
        create_encryption_service,
    )

    pub_id = UUID(publication_id)

    # Load encryption key from environment
    encryption_key = os.getenv("ENCRYPTION_KEY", "")
    if not encryption_key:
        return {"error": "ENCRYPTION_KEY environment variable not set"}
    encryption = create_encryption_service(encryption_key)

    async with async_session_maker() as session:
        pub_repo = SqlAlchemyPublicationRepository(session)
        page_repo = SqlAlchemyFacebookPageRepository(session)

        publication = await pub_repo.get_by_id_admin(pub_id)
        if not publication:
            return {"error": f"Publication {publication_id} not found"}

        if not publication.fb_listing_id:
            return {"status": "skipped", "reason": "no fb_listing_id — listing was never published"}

        # Category B lock — never retry if blocked
        if publication.blocked_until_confirmed:
            return {"status": "blocked", "publication_id": publication_id}

        if not publication.facebook_page_id:
            return {"error": "Publication has no facebook_page_id"}

        page = await page_repo.get_by_id(publication.facebook_page_id)
        if not page:
            return {"error": f"FacebookPage {publication.facebook_page_id} not found"}
        access_token = encryption.decrypt(page.page_access_token_encrypted)

        selector = build_publisher_selector(encryption)
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
            # Never let the adapter's raw exception text reach persisted storage or a
            # task result — it could embed the decrypted access_token above.
            safe_error = scrub_secret(str(exc), access_token)

            if classify_publisher_error(exc) == PublicationErrorCategory.B:
                # Category B — block queue for this seller
                publication.mark_failed(PublicationErrorCategory.B, safe_error)
                await pub_repo.update(publication)
                return {"status": "failed", "category": "B", "error": safe_error}
            else:
                # Category A — transient, caller decides retry
                return {"status": "failed", "category": "A", "error": safe_error}
