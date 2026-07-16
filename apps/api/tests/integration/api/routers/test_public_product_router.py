"""Tests for public product router (no authentication required)."""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.main import app
from prosell.infrastructure.models.product_model import ProductModel


@pytest.mark.asyncio
class TestPublicProductRouter:
    """Test GET /api/v1/public/products/{slug} and /image-urls endpoints."""

    async def test_get_published_product_returns_product(self, test_db_session: AsyncSession):
        """GET /{slug} returns published product with marketplace=true."""
        # Setup: Create a published product
        product = ProductModel(
            id=uuid4(),
            tenant_id=uuid4(),
            organization_id=uuid4(),
            category_id=uuid4(),
            title="Toyota Corolla 2022",
            slug="toyota-corolla-2022",
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
        test_db_session.add(product)
        await test_db_session.commit()

        # Act: Call endpoint
        client = TestClient(app)
        response = client.get("/api/v1/public/products/toyota-corolla-2022")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Toyota Corolla 2022"
        assert data["slug"] == "toyota-corolla-2022"
        assert data["price_cents"] == 2500000
        assert data["status"] == ProductStatus.PUBLISHED.value
        assert data["published_to_marketplace"] is True
        assert data["view_count"] == 6  # Should be incremented from 5

    async def test_get_product_not_found(self) -> None:
        """GET /{slug} returns 404 when product doesn't exist."""
        client = TestClient(app)
        response = client.get("/api/v1/public/products/nonexistent-slug")

        assert response.status_code == 404
        assert "Product not found" in response.json()["detail"]

    async def test_get_unpublished_product_returns_404(self, test_db_session: AsyncSession):
        """GET /{slug} returns 404 when product status != published."""
        # Setup: Create unpublished product
        product = ProductModel(
            id=uuid4(),
            tenant_id=uuid4(),
            organization_id=uuid4(),
            category_id=uuid4(),
            title="Unpublished Car",
            slug="unpublished-car",
            status=ProductStatus.DRAFT.value,  # Not published
            published_to_marketplace=True,
            condition="good",
            attributes={},
        )
        test_db_session.add(product)
        await test_db_session.commit()

        # Act
        client = TestClient(app)
        response = client.get("/api/v1/public/products/unpublished-car")

        # Assert
        assert response.status_code == 404
        assert "Product not found" in response.json()["detail"]

    async def test_get_not_marketplace_product_returns_404(self, test_db_session: AsyncSession):
        """GET /{slug} returns 404 when published_to_marketplace=false."""
        # Setup: Create product that's published but not to marketplace
        product = ProductModel(
            id=uuid4(),
            tenant_id=uuid4(),
            organization_id=uuid4(),
            category_id=uuid4(),
            title="Internal Only Car",
            slug="internal-only-car",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=False,  # Not on marketplace
            condition="good",
            attributes={},
        )
        test_db_session.add(product)
        await test_db_session.commit()

        # Act
        client = TestClient(app)
        response = client.get("/api/v1/public/products/internal-only-car")

        # Assert
        assert response.status_code == 404

    async def test_get_product_increments_view_count(self, test_db_session: AsyncSession):
        """GET /{slug} increments view_count."""
        # Setup
        product = ProductModel(
            id=uuid4(),
            tenant_id=uuid4(),
            organization_id=uuid4(),
            category_id=uuid4(),
            title="Test Car",
            slug="test-car",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            view_count=10,
            condition="good",
            attributes={},
        )
        test_db_session.add(product)
        await test_db_session.commit()
        product_id = product.id

        # Act: Call endpoint 3 times
        client = TestClient(app)
        for _ in range(3):
            response = client.get("/api/v1/public/products/test-car")
            assert response.status_code == 200

        # Assert: Check view_count was incremented
        stmt = select(ProductModel).where(ProductModel.id == product_id)
        result = await test_db_session.execute(stmt)
        updated_product = result.scalar_one()
        assert updated_product.view_count == 13  # Started at 10, incremented 3 times

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_returns_signed_urls(
        self, mock_spaces_dep, test_db_session: AsyncSession
    ):
        """GET /{slug}/image-urls returns signed URLs for all images."""
        # Setup: Mock DO Spaces service
        mock_spaces = AsyncMock()
        mock_spaces.generate_download_url.side_effect = [
            "https://do.spaces.com/car-front-signed?token=abc123",
            "https://do.spaces.com/car-side-signed?token=def456",
        ]
        mock_spaces_dep.return_value = mock_spaces

        # Setup: Create product with images
        product = ProductModel(
            id=uuid4(),
            tenant_id=uuid4(),
            organization_id=uuid4(),
            category_id=uuid4(),
            title="Image Test Car",
            slug="image-test-car",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["car-front.jpg", "car-side.jpg"],
            cover_image_key="car-front.jpg",
            condition="good",
            attributes={},
        )
        test_db_session.add(product)
        await test_db_session.commit()

        # Act
        client = TestClient(app)
        response = client.get("/api/v1/public/products/image-test-car/image-urls")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data["images"]) == 2
        assert data["images"][0]["key"] == "car-front.jpg"
        assert "token=" in data["images"][0]["url"]
        assert data["images"][1]["key"] == "car-side.jpg"

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_cover_image_first_when_separate(
        self, mock_spaces_dep, test_db_session: AsyncSession
    ):
        """GET /{slug}/image-urls puts cover_image first if not in image_urls."""
        # Setup: Mock DO Spaces
        mock_spaces = AsyncMock()
        mock_spaces.generate_download_url.side_effect = [
            "https://do.spaces.com/cover-signed",
            "https://do.spaces.com/other1-signed",
            "https://do.spaces.com/other2-signed",
        ]
        mock_spaces_dep.return_value = mock_spaces

        # Setup: Product where cover_image is separate
        product = ProductModel(
            id=uuid4(),
            tenant_id=uuid4(),
            organization_id=uuid4(),
            category_id=uuid4(),
            title="Cover Test Car",
            slug="cover-test-car",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["other-image-1.jpg", "other-image-2.jpg"],
            cover_image_key="cover-image.jpg",  # Different from image_urls
            condition="good",
            attributes={},
        )
        test_db_session.add(product)
        await test_db_session.commit()

        # Act
        client = TestClient(app)
        response = client.get("/api/v1/public/products/cover-test-car/image-urls")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data["images"]) == 3
        assert data["images"][0]["key"] == "cover-image.jpg"  # Cover image first

    @patch("prosell.infrastructure.api.routers.public_product_router.get_spaces_service")
    async def test_get_product_image_urls_reorders_cover_to_first(
        self, mock_spaces_dep, test_db_session: AsyncSession
    ):
        """GET /{slug}/image-urls moves cover to first position when it's in the list."""
        # Setup: Mock DO Spaces — order of calls matches reordered list
        mock_spaces = AsyncMock()
        mock_spaces.generate_download_url.side_effect = [
            "https://do.spaces.com/car-side-signed",  # cover first
            "https://do.spaces.com/car-front-signed",
            "https://do.spaces.com/car-back-signed",
        ]
        mock_spaces_dep.return_value = mock_spaces

        # Setup: Product where cover_image is in the list but NOT first
        product = ProductModel(
            id=uuid4(),
            tenant_id=uuid4(),
            organization_id=uuid4(),
            category_id=uuid4(),
            title="Reorder Cover Car",
            slug="reorder-cover-car",
            status=ProductStatus.PUBLISHED.value,
            published_to_marketplace=True,
            image_urls=["car-front.jpg", "car-side.jpg", "car-back.jpg"],
            cover_image_key="car-side.jpg",  # In list but not first!
            condition="good",
            attributes={},
        )
        test_db_session.add(product)
        await test_db_session.commit()

        # Act
        client = TestClient(app)
        response = client.get("/api/v1/public/products/reorder-cover-car/image-urls")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data["images"]) == 3
        # Cover should be moved to first position
        assert data["images"][0]["key"] == "car-side.jpg"
        # Others maintain relative order
        assert data["images"][1]["key"] == "car-front.jpg"
        assert data["images"][2]["key"] == "car-back.jpg"
        # cover_image_key should be in response
        assert data["cover_image_key"] == "car-side.jpg"

    async def test_get_product_image_urls_not_found(self) -> None:
        """GET /{slug}/image-urls returns 404 if product doesn't exist."""
        client = TestClient(app)
        response = client.get("/api/v1/public/products/nonexistent/image-urls")

        assert response.status_code == 404

    async def test_get_product_image_urls_not_published(self, test_db_session: AsyncSession):
        """GET /{slug}/image-urls returns 404 if product not published."""
        # Setup: Unpublished product
        product = ProductModel(
            id=uuid4(),
            tenant_id=uuid4(),
            organization_id=uuid4(),
            category_id=uuid4(),
            title="Draft Car",
            slug="draft-car",
            status=ProductStatus.DRAFT.value,
            published_to_marketplace=True,
            condition="good",
            attributes={},
        )
        test_db_session.add(product)
        await test_db_session.commit()

        # Act
        client = TestClient(app)
        response = client.get("/api/v1/public/products/draft-car/image-urls")

        # Assert
        assert response.status_code == 404
