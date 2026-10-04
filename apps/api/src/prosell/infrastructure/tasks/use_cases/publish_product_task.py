"""Taskiq task for publishing vehicle listings via Playwright/Graph API.

Image lifecycle (runs entirely within the task context):
  1. Load publication from DB (contains source image_urls stored by use case)
  2. Download each URL with httpx
  3. Process each with ImagePipelineService (compress < 1MB, resize 1080px, JPG, strip EXIF)
  4. Pass processed bytes list to service.publish(publication, access_token, image_bytes_list)

This design keeps the API request fast (no image downloads in request cycle)
and avoids serializing large image bytes into the Taskiq payload.
"""

from typing import TypedDict

from prosell.infrastructure.tasks.broker import broker


class PublishProductTaskResult(TypedDict, total=False):
    """Result shape for publish_product_task — fields populated vary by branch
    (error/blocked/published/failed/retry_scheduled), so all are optional."""

    error: str
    status: str
    publication_id: str
    fb_listing_id: str
    engine: str
    category: str
    retry_count: int
    delay_seconds: int


@broker.task
async def publish_product_task(publication_id: str) -> PublishProductTaskResult:
    """Execute publication via selected publisher strategy.

    Args:
        publication_id: UUID string of the Publication to publish.

    Returns:
        dict with status and relevant metadata.

    Error handling:
        - Category B (captcha/checkpoint/ban): sets blocked_until_confirmed=True, no retry
        - Category A (transient): increments retry_count, schedules retry with exponential backoff
          Delays: retry 1 = 60s, retry 2 = 300s, retry 3 = 900s, then mark failed
    """
    import os
    from uuid import UUID

    import httpx

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
    from prosell.infrastructure.services.image_pipeline import ImagePipelineService
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

        # Category B lock — never retry if blocked, requires human confirmation
        if publication.blocked_until_confirmed:
            return {"status": "blocked", "publication_id": publication_id}

        # Two-phase commit: mark PUBLISHING before attempting (prevents duplicate dispatches)
        publication.mark_publishing()
        await pub_repo.update(publication)

        # Scrubbed in the except block below — may still be None if the exception
        # happens before decryption (e.g. missing facebook_page_id).
        access_token: str | None = None
        try:
            # Get decrypted page access token from DB (never in task payload)
            if not publication.facebook_page_id:
                raise ValueError("Publication has no facebook_page_id")

            page = await page_repo.get_by_id(publication.facebook_page_id)
            if not page:
                raise ValueError(f"FacebookPage {publication.facebook_page_id} not found")
            access_token = encryption.decrypt(page.page_access_token_encrypted)

            # Download and process images (source URLs stored in publication.image_urls)
            image_pipeline = ImagePipelineService()
            image_bytes_list: list[bytes] = []
            async with httpx.AsyncClient(timeout=30.0) as client:
                for url in publication.image_urls:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    processed = await image_pipeline.process(resp.content)
                    image_bytes_list.append(processed)

            # Select publisher strategy (playwright vs graph_api based on settings).
            # Shared with update_listing_task/delete_listing_task so all three tasks
            # can never independently drift on which graph_api implementation they wire.
            selector = build_publisher_selector(encryption)
            service, engine_name = selector.select()

            # Execute publish with processed image bytes
            fb_listing_id = await service.publish(publication, access_token, image_bytes_list)

            # Mark PUBLISHED with engine metadata
            engine_version = f"{engine_name}_phase1"
            publication.mark_published(fb_listing_id, engine_name, engine_version)
            await pub_repo.update(publication)

            return {
                "status": "published",
                "fb_listing_id": fb_listing_id,
                "engine": engine_name,
            }

        except Exception as exc:
            # Never let the adapter's raw exception text reach persisted storage or a
            # task result — it could embed the decrypted access_token above (e.g. an
            # HTTP/Playwright timeout error echoing request state).
            safe_error = scrub_secret(str(exc), access_token)
            category = classify_publisher_error(exc)

            if category == PublicationErrorCategory.B:
                # Category B — blocking error, requires human confirmation before retry
                publication.mark_failed(PublicationErrorCategory.B, safe_error)
                await pub_repo.update(publication)
                return {"status": "failed", "category": "B", "error": safe_error}

            else:
                # Category A — transient error, schedule retry with exponential backoff
                publication.increment_retry()
                await pub_repo.update(publication)

                retry_delays = [60, 300, 900]  # 1min, 5min, 15min
                if publication.retry_count <= len(retry_delays):
                    delay = retry_delays[publication.retry_count - 1]
                    await (
                        publish_product_task.kicker()
                        .with_labels(delay=delay)
                        .kiq(publication_id=publication_id)
                    )
                    return {
                        "status": "retry_scheduled",
                        "retry_count": publication.retry_count,
                        "delay_seconds": delay,
                    }
                else:
                    publication.mark_failed(
                        PublicationErrorCategory.A,
                        safe_error,
                        "Max retries exceeded",
                    )
                    await pub_repo.update(publication)
                    return {"status": "failed", "category": "A", "error": safe_error}
