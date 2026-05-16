"""Integration tests for PublicationRepository.

Tests the SQLAlchemy implementation of IPublicationRepository.
"""

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.publication import PublicationStatus
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.models.publication_model import PublicationModel
from prosell.infrastructure.repositories.publication_repository_impl import (
    SqlAlchemyPublicationRepository,
)

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
async def publication_repo(db_session: AsyncSession) -> SqlAlchemyPublicationRepository:
    """Return a PublicationRepository instance."""
    return SqlAlchemyPublicationRepository(db_session)


@pytest.fixture
async def sample_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> ProductModel:
    """Create a sample product for testing publications."""
    product_id = uuid4()
    product = ProductModel(
        id=product_id,
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,  # REQUIRED: NOT NULL in DB
        title="Test Product",
        status="active",
        price_cents=1500000,
        category_id=test_category.id,  # Use actual category from fixture
    )

    db_session.add(product)
    await db_session.flush()
    return product


@pytest.fixture
async def sample_publication(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    sample_product: ProductModel,
) -> PublicationModel:
    """Create a sample publication for testing."""

    publication_model = PublicationModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        product_id=sample_product.id,
        seller_user_id=None,  # Nullable, can be None
        facebook_page_id=None,  # Nullable, can be None
        status=PublicationStatus.PUBLISHED,
        fb_listing_id="fb_listing_12345",
        title="Test Vehicle",
        description="Test description",
        price_cents=1500000,
        zip_code="12345",
        image_urls=["https://example.com/image1.jpg"],
    )

    db_session.add(publication_model)
    await db_session.flush()
    return publication_model


# =============================================================================
# TESTS: get_by_fb_listing_id
# =============================================================================


@pytest.mark.asyncio
async def test_get_by_fb_listing_id_success(publication_repo, sample_publication):
    """Test successful retrieval of publication by Facebook listing ID."""
    # Act
    result = await publication_repo.get_by_fb_listing_id(sample_publication.fb_listing_id)

    # Assert
    assert result is not None
    assert result.id == sample_publication.id
    assert result.fb_listing_id == sample_publication.fb_listing_id
    assert result.status == PublicationStatus.PUBLISHED


@pytest.mark.asyncio
async def test_get_by_fb_listing_id_not_found(publication_repo):
    """Test get_by_fb_listing_id with non-existent listing ID."""
    # Act
    result = await publication_repo.get_by_fb_listing_id("nonexistent_listing")

    # Assert
    assert result is None


@pytest.mark.asyncio
async def test_get_by_fb_listing_id_with_none_listing_id(publication_repo):
    """Test get_by_fb_listing_id with None listing ID."""
    # Act & Assert
    with pytest.raises(ValueError):
        await publication_repo.get_by_fb_listing_id(None)


@pytest.mark.asyncio
async def test_get_by_fb_listing_id_filters_by_tenant(
    db_session,
    test_organization,
    sample_product,
):
    """Test that get_by_fb_listing_id respects tenant isolation."""
    # Create two publications with same fb_listing_id but different tenants
    listing_id = "shared_listing_id"

    # First publication
    pub1 = PublicationModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        product_id=sample_product.id,
        seller_user_id=None,  # Nullable
        facebook_page_id=None,  # Nullable
        status=PublicationStatus.PUBLISHED,
        fb_listing_id=listing_id,
        title="Test Vehicle 1",
        price_cents=1500000,
        zip_code="12345",
    )
    db_session.add(pub1)

    # Second publication with different tenant
    from prosell.infrastructure.models.organization_model import OrganizationModel

    org2_id = uuid4()
    org2 = OrganizationModel(
        id=org2_id,
        tenant_id=org2_id,
        name="Another Org",
        status="active",
        description="Test",
        settings={},
    )
    db_session.add(org2)
    await db_session.flush()

    pub2 = PublicationModel(
        id=uuid4(),
        tenant_id=org2.tenant_id,
        product_id=sample_product.id,
        seller_user_id=None,  # Nullable
        facebook_page_id=None,  # Nullable
        status=PublicationStatus.PUBLISHED,
        fb_listing_id=listing_id,  # Same listing ID
        title="Test Vehicle 2",
        price_cents=2000000,
        zip_code="54321",
    )
    db_session.add(pub2)
    await db_session.flush()

    # Act - query WITH tenant filter should return only pub1
    repo = SqlAlchemyPublicationRepository(db_session)
    result = await repo.get_by_fb_listing_id(
        listing_id,
        tenant_id=test_organization.tenant_id,  # Filter by tenant
    )

    # Assert - should return pub1 (from test_organization)
    assert result is not None
    assert result.fb_listing_id == listing_id
    assert result.tenant_id == test_organization.tenant_id
    assert result.title == "Test Vehicle 1"
