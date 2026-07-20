"""Tests for public product router (no authentication required).

These tests use the integration test database (prosell_test on port 5433).
Uses a shared connection pattern so the endpoint can see test data without commits.
"""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from tests.integration._constants import TEST_DB_URL

from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


@pytest_asyncio.fixture
async def shared_session() -> AsyncGenerator[AsyncSession]:
    """Create a shared session for test data and endpoint to use.

    Both test setup and the endpoint override use the SAME session,
    so the endpoint can see flushed (but uncommitted) data.
    """
    engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session, session.begin():
        yield session
        # Rollback on exit to clean up test data
        await session.rollback()

    await engine.dispose()


@pytest.fixture
def setup_override(shared_session: AsyncSession):
    """Override get_async_session to return the shared test session.

    This lets the endpoint see flushed data from the test without commits.
    """

    async def _override() -> AsyncGenerator[AsyncSession]:
        yield shared_session

    app.dependency_overrides[get_async_session] = _override
    yield
    app.dependency_overrides.pop(get_async_session, None)


async def _create_test_org(session: AsyncSession) -> OrganizationModel:
    """Create a test organization for FK constraints."""
    org_id = uuid4()
    org = OrganizationModel(
        id=org_id,
        tenant_id=org_id,
        name=f"Test Org {uuid4().hex[:8]}",
        status="active",
        settings={},
    )
    session.add(org)
    await session.flush()
    return org


@pytest.mark.asyncio
@pytest.mark.usefixtures("setup_override")
class TestPublicProductRouter:
    """Test GET /api/v1/public/products/{slug} and /image-urls endpoints."""

    async def test_get_published_product_returns_product(self, shared_session: AsyncSession):
        """GET /{slug} returns published product with marketplace=true."""
        org = await _create_test_org(shared_session)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=uuid4(),
            title="Toyota Corolla 2022",
            slug=f"toyota-corolla-2022-{uuid4().hex[:6]}",
            description="Clean car, low mileage",
            price_cents=2500000,
            currency="USD",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["car-front.jpg", "car-side.jpg"],
            cover_image_key="car-front.jpg",
            location_city="Caracas",
            location_state="Distrito Capital",
            view_count=5,
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}")

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Toyota Corolla 2022"
        assert data["slug"] == product.slug
        assert data["price_cents"] == 2500000
        assert data["status"] == ProductStatus.PUBLISHED.value
        assert data["published_to_marketplace"] is True
        assert data["view_count"] == 6  # incremented from 5

    async def test_get_product_not_found(self) -> None:
        """GET /{slug} returns 404 when product doesn't exist."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/public/products/nonexistent-slug")

        assert response.status_code == 404
        assert "Product not found" in response.json()["detail"]

    async def test_get_unpublished_product_still_accessible_via_slug(
        self, shared_session: AsyncSession
    ):
        """GET /{slug} returns product even when status != published.

        Any product with a slug is accessible - slug acts as secret link.
        """
        org = await _create_test_org(shared_session)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=uuid4(),
            title="Unpublished Car",
            slug=f"unpublished-car-{uuid4().hex[:6]}",
            status=ProductStatus.DRAFT.value,
            published_to_marketplace=True,
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}")

        # ponytail: slug = secret link, any product with slug is accessible
        assert response.status_code == 200
        assert response.json()["title"] == "Unpublished Car"

    async def test_get_not_marketplace_product_still_accessible_via_slug(
        self, shared_session: AsyncSession
    ):
        """GET /{slug} returns product even when published_to_marketplace=false.

        Any product with a slug is accessible - slug acts as secret link.
        """
        org = await _create_test_org(shared_session)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=uuid4(),
            title="Internal Only Car",
            slug=f"internal-only-{uuid4().hex[:6]}",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=False,
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}")

        # ponytail: slug = secret link, any product with slug is accessible
        assert response.status_code == 200
        assert response.json()["title"] == "Internal Only Car"

    async def test_get_product_increments_view_count(self, shared_session: AsyncSession):
        """GET /{slug} increments view_count."""
        org = await _create_test_org(shared_session)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=uuid4(),
            title="Test Car",
            slug=f"view-count-{uuid4().hex[:6]}",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            view_count=10,
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = None
            for _ in range(3):
                response = await client.get(f"/api/v1/public/products/{product.slug}")
                assert response.status_code == 200

        # The endpoint increments view_count each time
        # Last response should show view_count = 13 (started at 10, incremented 3x)
        assert response is not None
        assert response.json()["view_count"] == 13

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_returns_signed_urls(
        self, mock_spaces_dep, shared_session: AsyncSession
    ):
        """GET /{slug}/image-urls returns signed URLs for all images."""
        mock_spaces = AsyncMock()
        mock_spaces.generate_download_url.side_effect = [
            "https://do.spaces.com/car-front-signed?token=abc123",
            "https://do.spaces.com/car-side-signed?token=def456",
        ]
        mock_spaces_dep.return_value = mock_spaces

        org = await _create_test_org(shared_session)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=uuid4(),
            title="Image Test Car",
            slug=f"image-test-{uuid4().hex[:6]}",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["car-front.jpg", "car-side.jpg"],
            cover_image_key="car-front.jpg",
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}/image-urls")

        assert response.status_code == 200
        data = response.json()
        assert len(data["images"]) == 2
        assert data["images"][0]["key"] == "car-front.jpg"
        assert "token=" in data["images"][0]["url"]
        assert data["images"][1]["key"] == "car-side.jpg"

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_cover_image_first_when_separate(
        self, mock_spaces_dep, shared_session: AsyncSession
    ):
        """GET /{slug}/image-urls puts cover_image first if not in image_urls."""
        mock_spaces = AsyncMock()
        mock_spaces.generate_download_url.side_effect = [
            "https://do.spaces.com/cover-signed",
            "https://do.spaces.com/other1-signed",
            "https://do.spaces.com/other2-signed",
        ]
        mock_spaces_dep.return_value = mock_spaces

        org = await _create_test_org(shared_session)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=uuid4(),
            title="Cover Test Car",
            slug=f"cover-test-{uuid4().hex[:6]}",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["other-image-1.jpg", "other-image-2.jpg"],
            cover_image_key="cover-image.jpg",
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}/image-urls")

        assert response.status_code == 200
        data = response.json()
        assert len(data["images"]) == 3
        assert data["images"][0]["key"] == "cover-image.jpg"

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_reorders_cover_to_first(
        self, mock_spaces_dep, shared_session: AsyncSession
    ):
        """GET /{slug}/image-urls moves cover to first position when it's in the list."""
        mock_spaces = AsyncMock()
        mock_spaces.generate_download_url.side_effect = [
            "https://do.spaces.com/car-side-signed",
            "https://do.spaces.com/car-front-signed",
            "https://do.spaces.com/car-back-signed",
        ]
        mock_spaces_dep.return_value = mock_spaces

        org = await _create_test_org(shared_session)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=uuid4(),
            title="Reorder Cover Car",
            slug=f"reorder-cover-{uuid4().hex[:6]}",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["car-front.jpg", "car-side.jpg", "car-back.jpg"],
            cover_image_key="car-side.jpg",
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}/image-urls")

        assert response.status_code == 200
        data = response.json()
        assert len(data["images"]) == 3
        assert data["images"][0]["key"] == "car-side.jpg"
        assert data["images"][1]["key"] == "car-front.jpg"
        assert data["images"][2]["key"] == "car-back.jpg"
        assert data["cover_image_key"] == "car-side.jpg"

    async def test_get_product_image_urls_not_found(self) -> None:
        """GET /{slug}/image-urls returns 404 if product doesn't exist."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/public/products/nonexistent/image-urls")

        assert response.status_code == 404

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_works_for_draft(
        self, mock_spaces_dep, shared_session: AsyncSession
    ):
        """GET /{slug}/image-urls works for draft products (slug = secret link)."""
        mock_spaces = AsyncMock()
        mock_spaces.generate_download_url.return_value = "https://do.spaces.com/signed"
        mock_spaces_dep.return_value = mock_spaces

        org = await _create_test_org(shared_session)

        product = ProductModel(
            id=uuid4(),
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=uuid4(),
            title="Draft Car",
            slug=f"draft-image-{uuid4().hex[:6]}",
            status=ProductStatus.DRAFT.value,
            published_to_marketplace=True,
            image_urls=["img.jpg"],
            condition="good",
            attributes={},
        )
        shared_session.add(product)
        await shared_session.flush()

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/v1/public/products/{product.slug}/image-urls")

        # ponytail: slug = secret link, any product with slug is accessible
        assert response.status_code == 200
