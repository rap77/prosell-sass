"""Tests for PublishVehicleUseCase, UpdateListingUseCase, DeleteListingUseCase."""

import uuid
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.dto.publisher.publish import PublishProductRequest
from prosell.application.use_cases.publisher.publish_vehicle import PublishVehicleUseCase
from prosell.domain.entities.publication import Publication, PublicationStatus


@pytest.fixture
def mock_publication_repo():
    repo = MagicMock()
    repo.get_by_id = AsyncMock()
    repo.create = AsyncMock()
    repo.update = AsyncMock()
    return repo


@pytest.fixture
def mock_publication_repo_with_publication(mock_publication_repo):
    mock_publication_repo.create.return_value = Publication(
        id=uuid4(),
        product_id=uuid4(),
        tenant_id=uuid4(),
        seller_user_id=uuid4(),
        facebook_page_id=uuid4(),
        title="2020 Toyota Camry",
        price_cents=2_500_000,
        zip_code="90210",
        image_urls=["https://example.com/img1.jpg"],
    )
    return mock_publication_repo


async def test_publish_vehicle_creates_publication_record(mock_publication_repo_with_publication):
    """PublishVehicleUseCase creates a Publication with status PENDING then dispatches task."""
    mock_dispatcher = AsyncMock()
    use_case = PublishVehicleUseCase(  # type: ignore[call-arg]
        publication_repo=mock_publication_repo_with_publication,
        seller_user_id=uuid4(),
        task_dispatcher=mock_dispatcher,
    )
    request = PublishProductRequest(
        product_id=uuid4(),
        tenant_id=uuid4(),
        facebook_page_id=uuid4(),
        title="2020 Toyota Camry",
        price_cents=2_500_000,
        zip_code="90210",
        image_urls=["https://example.com/img1.jpg"],
    )
    result = await use_case.execute(request)

    mock_publication_repo_with_publication.create.assert_called_once()
    mock_dispatcher.dispatch_publish.assert_called_once()
    assert result.status == PublicationStatus.PENDING.value


async def test_publish_vehicle_dispatches_task_with_publication_id(
    mock_publication_repo_with_publication,
):
    """dispatch_publish() is called with the correct publication_id after create."""
    created_pub = mock_publication_repo_with_publication.create.return_value
    mock_dispatcher = AsyncMock()

    use_case = PublishVehicleUseCase(  # type: ignore[call-arg]
        publication_repo=mock_publication_repo_with_publication,
        seller_user_id=uuid4(),
        task_dispatcher=mock_dispatcher,
    )
    request = PublishProductRequest(
        product_id=uuid4(),
        tenant_id=uuid4(),
        facebook_page_id=uuid4(),
        title="Test",
        price_cents=10_000,
        zip_code="90210",
        image_urls=["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
    )
    await use_case.execute(request)

    mock_dispatcher.dispatch_publish.assert_called_once_with(created_pub.id)


async def test_update_listing_use_case(mock_publication_repo):
    """UpdateListingUseCase updates publication fields and dispatches task."""
    from prosell.application.use_cases.publisher.update_listing import (
        UpdateListingRequest,
        UpdateListingUseCase,
    )

    pub_id = uuid.uuid4()
    mock_pub = Publication(
        id=pub_id,
        product_id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        seller_user_id=uuid.uuid4(),
        facebook_page_id=uuid.uuid4(),
        title="Test",
        price_cents=10000,
        zip_code="90210",
        status=PublicationStatus.PUBLISHED,
        fb_listing_id="fb_123",
        image_urls=[],
    )
    mock_publication_repo.get_by_id.return_value = mock_pub

    mock_dispatcher = AsyncMock()
    use_case = UpdateListingUseCase(
        publication_repo=mock_publication_repo, task_dispatcher=mock_dispatcher
    )  # type: ignore[call-arg]
    request = UpdateListingRequest(
        publication_id=pub_id,
        price_cents=15000,
        description="Updated description",
        tenant_id=uuid4(),
    )
    result = await use_case.execute(request)

    mock_publication_repo.update.assert_called_once()
    mock_dispatcher.dispatch_update.assert_called_once()
    assert result.status == "published"


async def test_update_listing_raises_if_not_published(mock_publication_repo):
    """UpdateListingUseCase raises ValueError if publication is not PUBLISHED."""
    from prosell.application.use_cases.publisher.update_listing import (
        UpdateListingRequest,
        UpdateListingUseCase,
    )

    pub_id = uuid.uuid4()
    mock_pub = Publication(
        id=pub_id,
        product_id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        seller_user_id=uuid.uuid4(),
        facebook_page_id=uuid.uuid4(),
        title="Test",
        price_cents=10000,
        zip_code="90210",
        status=PublicationStatus.PENDING,
        image_urls=[],
    )
    mock_publication_repo.get_by_id.return_value = mock_pub

    use_case = UpdateListingUseCase(
        publication_repo=mock_publication_repo, task_dispatcher=AsyncMock()
    )  # type: ignore[call-arg]
    request = UpdateListingRequest(
        publication_id=pub_id, price_cents=15000, tenant_id=uuid.uuid4()
    )

    with pytest.raises(ValueError, match="Cannot update a non-published listing"):
        await use_case.execute(request)


async def test_delete_listing_transitions_to_sold(mock_publication_repo):
    """DeleteListingUseCase marks publication SOLD and dispatches delete task."""
    from prosell.application.use_cases.publisher.delete_listing import DeleteListingUseCase

    pub_id = uuid.uuid4()
    mock_pub = Publication(
        id=pub_id,
        product_id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        seller_user_id=uuid.uuid4(),
        facebook_page_id=uuid.uuid4(),
        title="Test",
        price_cents=10000,
        zip_code="90210",
        status=PublicationStatus.PUBLISHED,
        fb_listing_id="fb_123",
        image_urls=[],
    )
    mock_publication_repo.get_by_id.return_value = mock_pub

    mock_dispatcher = AsyncMock()
    use_case = DeleteListingUseCase(
        publication_repo=mock_publication_repo, task_dispatcher=mock_dispatcher
    )  # type: ignore[call-arg]
    result = await use_case.execute(pub_id, tenant_id=uuid4())

    mock_publication_repo.update.assert_called_once()
    mock_dispatcher.dispatch_delete.assert_called_once()
    assert result.status == "sold"
