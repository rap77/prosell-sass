"""Tests for AutoRepublishUseCase — PUBLISH-06."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

from prosell.application.use_cases.publisher.auto_republish import AutoRepublishUseCase
from prosell.domain.entities.publication import Publication, PublicationStatus


def make_expiring_publication() -> Publication:
    return Publication(
        id=uuid4(),
        product_id=uuid4(),
        tenant_id=uuid4(),
        seller_user_id=uuid4(),
        facebook_page_id=uuid4(),
        title="2020 Toyota Camry",
        price_cents=2500000,
        zip_code="90210",
        status=PublicationStatus.PUBLISHED,
        fb_listing_id="fb_abc123",
        image_urls=["https://example.com/img.jpg"],
        published_at=datetime.now(UTC) - timedelta(days=6),
        expires_at=datetime.now(UTC) + timedelta(hours=24),  # 24h left — within 48h window
    )


async def test_auto_republish_detects_listings_within_48h():
    """AutoRepublishUseCase calls get_approaching_expiry(hours_before=48)."""
    repo = AsyncMock()
    repo.get_approaching_expiry.return_value = []
    dispatcher = AsyncMock()

    use_case = AutoRepublishUseCase(publication_repo=repo, task_dispatcher=dispatcher)
    result = await use_case.execute()

    repo.get_approaching_expiry.assert_called_once_with(hours_before=48)
    assert result["checked"] == 0


async def test_auto_republish_clones_and_creates_new_publication():
    """AutoRepublishUseCase creates new Publication with same content but new id."""
    repo = AsyncMock()
    expiring = make_expiring_publication()
    repo.get_approaching_expiry.return_value = [expiring]

    new_pub = Publication(
        id=uuid4(),  # new id
        product_id=expiring.product_id,
        tenant_id=expiring.tenant_id,
        seller_user_id=expiring.seller_user_id,
        facebook_page_id=expiring.facebook_page_id,
        title=expiring.title,
        price_cents=expiring.price_cents,
        zip_code=expiring.zip_code,
        image_urls=expiring.image_urls,
    )
    repo.create.return_value = new_pub
    dispatcher = AsyncMock()

    use_case = AutoRepublishUseCase(publication_repo=repo, task_dispatcher=dispatcher)
    result = await use_case.execute()

    repo.create.assert_called_once()
    dispatcher.dispatch_publish.assert_called_once_with(new_pub.id)
    assert result["republished"] == 1


async def test_auto_republish_marks_old_publication_expired():
    """AutoRepublishUseCase marks old publication EXPIRED after cloning."""
    repo = AsyncMock()
    expiring = make_expiring_publication()
    repo.get_approaching_expiry.return_value = [expiring]
    repo.create.return_value = Publication(
        id=uuid4(),
        product_id=expiring.product_id,
        tenant_id=expiring.tenant_id,
        seller_user_id=expiring.seller_user_id,
        facebook_page_id=expiring.facebook_page_id,
        title=expiring.title,
        price_cents=expiring.price_cents,
        zip_code=expiring.zip_code,
    )
    dispatcher = AsyncMock()

    use_case = AutoRepublishUseCase(publication_repo=repo, task_dispatcher=dispatcher)
    await use_case.execute()

    # The old publication should have been updated (marked EXPIRED)
    assert repo.update.called
    updated_pub = repo.update.call_args[0][0]
    assert updated_pub.status == PublicationStatus.EXPIRED
