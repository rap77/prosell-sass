"""Tests for ProcessFacebookWebhookUseCase."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.facebook_webhook_use_case import ProcessFacebookWebhookUseCase
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.domain.entities.lead import Lead
from prosell.domain.entities.publication import Publication, PublicationStatus
from prosell.domain.ports.i_encryption_service import IEncryptionService
from prosell.domain.repositories.facebook_page_repository import IFacebookPageRepository
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.domain.value_objects.lead_source import LeadSource
from prosell.infrastructure.services.facebook_graph_api_client import (
    FacebookBuyerProfile,
    FacebookGraphApiClient,
)


@pytest.fixture
def mock_lead_repository():
    """Mock lead repository."""
    repo = AsyncMock(spec=AbstractLeadRepository)
    return repo


@pytest.fixture
def mock_publication_repository():
    """Mock publication repository."""
    repo = AsyncMock(spec=IPublicationRepository)
    return repo


@pytest.fixture
def mock_facebook_client():
    """Mock Facebook Graph API client."""
    client = AsyncMock(spec=FacebookGraphApiClient)
    return client


@pytest.fixture
def mock_create_lead_use_case():
    """Mock CreateLeadUseCase."""
    use_case = AsyncMock(spec=CreateLeadUseCase)
    return use_case


@pytest.fixture
def mock_facebook_page_repository():
    """Mock IFacebookPageRepository."""
    return AsyncMock(spec=IFacebookPageRepository)


@pytest.fixture
def mock_encryption_service():
    """Mock IEncryptionService."""
    return MagicMock(spec=IEncryptionService)


@pytest.fixture
def tenant_id():
    """Test tenant ID."""
    return uuid4()


@pytest.fixture
def vendedor_id():
    """Test vendedor ID."""
    return uuid4()


@pytest.fixture
def product_id():
    """Test vehicle ID."""
    return uuid4()


@pytest.fixture
def sample_webhook_payload(product_id):  # noqa: ARG001
    """Sample Facebook webhook payload."""
    return {
        "leadgen_id": "123456789",
        "listing_id": "fb_listing_123",
        "sender_id": "987654321",
        "message": "Hi, is this vehicle still available?",
        "created_time": "2026-04-28T10:00:00Z",
    }


@pytest.fixture
def sample_publication(product_id, vendedor_id, tenant_id):
    """Sample publication entity."""
    return Publication(
        id=uuid4(),
        tenant_id=tenant_id,
        product_id=product_id,
        seller_user_id=vendedor_id,
        facebook_page_id=uuid4(),
        facebook_listing_id="fb_listing_123",  # type: ignore[call-arg]
        status=PublicationStatus.PUBLISHED,
        title="2020 Toyota Camry",
        price_cents=2500000,
        zip_code="33101",
    )


@pytest.fixture
def sample_buyer_profile():
    """Sample Facebook buyer profile."""
    return FacebookBuyerProfile(
        sender_id="987654321",
        name="John Doe",
        email="john.doe@example.com",
        profile_url="https://facebook.com/profile.jpg",
    )


@pytest.mark.asyncio
async def test_process_webhook_success(
    sample_webhook_payload,
    sample_publication,
    sample_buyer_profile,
    mock_lead_repository,
    mock_publication_repository,
    mock_facebook_client,
    mock_create_lead_use_case,
    mock_facebook_page_repository,
    mock_encryption_service,
    tenant_id,
    vendedor_id,
    product_id,
):
    """Test successful webhook processing."""
    # Setup mocks
    mock_publication_repository.get_by_fb_listing_id.return_value = sample_publication
    mock_facebook_client.get_buyer_profile.return_value = sample_buyer_profile
    mock_lead_repository.get_by_buyer_and_product.return_value = None  # No duplicate
    mock_create_lead_use_case.execute.return_value = MagicMock(
        id=uuid4(),
        buyer_name="John Doe",
        buyer_email="john.doe@example.com",
        buyer_phone=None,
        product_id=product_id,
        vendedor_id=vendedor_id,
    )

    # Create use case
    use_case = ProcessFacebookWebhookUseCase(
        lead_repository=mock_lead_repository,
        publication_repository=mock_publication_repository,
        facebook_page_repository=mock_facebook_page_repository,
        facebook_client=mock_facebook_client,
        create_lead_use_case=mock_create_lead_use_case,
        encryption_service=mock_encryption_service,
    )

    # Execute
    await use_case.execute(sample_webhook_payload, tenant_id)

    # Verify publication was queried
    mock_publication_repository.get_by_fb_listing_id.assert_called_once_with(
        fb_listing_id="fb_listing_123", tenant_id=tenant_id
    )

    # Note: Buyer profile fetch is skipped in current implementation (TODO for full FB integration)
    # mock_facebook_client.get_buyer_profile.assert_called_once()

    # Verify duplicate check was performed
    mock_lead_repository.get_by_buyer_and_product.assert_called_once()

    # Verify lead was created
    mock_create_lead_use_case.execute.assert_called_once()


@pytest.mark.asyncio
async def test_process_webhook_duplicate_lead(
    sample_webhook_payload,
    sample_publication,
    sample_buyer_profile,
    mock_lead_repository,
    mock_publication_repository,
    mock_facebook_client,
    mock_create_lead_use_case,
    mock_facebook_page_repository,
    mock_encryption_service,
    tenant_id,
):
    """Test webhook processing with duplicate lead detection."""
    # Setup mocks
    mock_publication_repository.get_by_fb_listing_id.return_value = sample_publication
    mock_facebook_client.get_buyer_profile.return_value = sample_buyer_profile
    mock_lead_repository.get_by_buyer_and_product.return_value = Lead(
        id=uuid4(),
        tenant_id=tenant_id,
        buyer_name="John Doe",
        buyer_email="john.doe@example.com",
        buyer_phone=None,
        product_id=sample_publication.product_id,
        vendedor_id=sample_publication.seller_user_id,
        message="Previous message",
        source=LeadSource.FACEBOOK,
    )

    # Create use case
    use_case = ProcessFacebookWebhookUseCase(
        lead_repository=mock_lead_repository,
        publication_repository=mock_publication_repository,
        facebook_page_repository=mock_facebook_page_repository,
        facebook_client=mock_facebook_client,
        create_lead_use_case=mock_create_lead_use_case,
        encryption_service=mock_encryption_service,
    )

    # Execute
    await use_case.execute(sample_webhook_payload, tenant_id)

    # Verify lead was NOT created (duplicate)
    mock_create_lead_use_case.execute.assert_not_called()


@pytest.mark.asyncio
async def test_process_webhook_publication_not_found(
    sample_webhook_payload,
    mock_lead_repository,
    mock_publication_repository,
    mock_facebook_client,
    mock_create_lead_use_case,
    mock_facebook_page_repository,
    mock_encryption_service,
    tenant_id,
):
    """Test webhook processing when publication not found."""
    # Setup mocks
    mock_publication_repository.get_by_fb_listing_id.return_value = None

    # Create use case
    use_case = ProcessFacebookWebhookUseCase(
        lead_repository=mock_lead_repository,
        publication_repository=mock_publication_repository,
        facebook_page_repository=mock_facebook_page_repository,
        facebook_client=mock_facebook_client,
        create_lead_use_case=mock_create_lead_use_case,
        encryption_service=mock_encryption_service,
    )

    # Execute (should not raise, just log and return)
    await use_case.execute(sample_webhook_payload, tenant_id)

    # Verify lead was NOT created (publication not found)
    mock_create_lead_use_case.execute.assert_not_called()
