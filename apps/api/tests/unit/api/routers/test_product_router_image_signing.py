"""Unit tests for product router returning signed (presigned) image URLs.

Regression for the bug where image_urls[] in list/detail responses leaked the
internal docker network endpoint (e.g. http://minio:9000/...) which the browser
cannot resolve. The router must sign each URL via spaces.generate_download_url()
so the browser can fetch the object from the private bucket.

The use case and repo are mocked: we simulate that the DB returned
image_urls[] with raw internal-endpoint URLs, and verify the router transforms
each one into a presigned URL before responding.
"""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient
from uuid import UUID

from prosell.application.dto.product.response import ProductResponse
from prosell.application.use_cases.product.list_products import (
    ProductListResponse,
)
from prosell.domain.entities.user import User
from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_spaces_service,
)
from prosell.infrastructure.api.main import app


# Sample signed URL with X-Amz-Signature (what the browser will receive)
SIGNED_URL_1 = (
    "http://localhost:9000/prosell-assets/orgs/tenant-1/vehicles/key1.jpg"
    "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=deadbeef1"
)
SIGNED_URL_2 = (
    "http://localhost:9000/prosell-assets/orgs/tenant-1/vehicles/key2.jpg"
    "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=deadbeef2"
)

# Raw URLs as they would come from the DB (internal endpoint, NOT signed)
RAW_URL_1 = "http://minio:9000/prosell-assets/orgs/tenant-1/vehicles/key1.jpg"
RAW_URL_2 = "http://minio:9000/prosell-assets/orgs/tenant-1/vehicles/key2.jpg"

TEST_TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
TEST_USER_ID = UUID("22222222-2222-2222-2222-222222222222")
TEST_ORG_ID = UUID("33333333-3333-3333-3333-333333333333")
TEST_CATEGORY_ID = UUID("44444444-4444-4444-4444-444444444444")
TEST_PRODUCT_ID = UUID("55555555-5555-5555-5555-555555555555")


def _make_user() -> User:
    return User(
        id=TEST_USER_ID,
        email="test@example.com",
        full_name="Test User",
        tenant_id=TEST_TENANT_ID,
    )


def _make_spaces() -> AsyncMock:
    """Spaces service that signs each key it receives.

    The router extracts the key from each raw URL (split on `bucket/`) and
    calls `generate_download_url(key)`. The mock maps each KEY to a signed URL.
    """
    spaces = AsyncMock()
    # key (after split) -> signed URL
    key_to_signed = {
        "orgs/tenant-1/vehicles/key1.jpg": SIGNED_URL_1,
        "orgs/tenant-1/vehicles/key2.jpg": SIGNED_URL_2,
    }
    spaces.generate_download_url = AsyncMock(side_effect=lambda key: key_to_signed[key])
    spaces.bucket = "prosell-assets"
    spaces.endpoint = "http://minio:9000"
    return spaces


def _make_product(image_urls: list[str]) -> ProductResponse:
    """Build a ProductResponse with the given image_urls and minimal valid fields."""
    return ProductResponse(
        id=TEST_PRODUCT_ID,
        tenant_id=TEST_TENANT_ID,
        organization_id=TEST_ORG_ID,
        category_id=TEST_CATEGORY_ID,
        title="Test Product",
        price_cents=10000,
        currency="USD",
        condition=ProductCondition.USED.value,
        status=ProductStatus.PUBLISHED.value,
        image_urls=image_urls,
        is_featured=False,
        view_count=0,
        favorite_count=0,
        created_at="2026-01-01T00:00:00Z",  # type: ignore[arg-type]
        updated_at="2026-01-01T00:00:00Z",  # type: ignore[arg-type]
    )


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient]:
    """Async client with auth and spaces overridden."""
    user = _make_user()
    spaces = _make_spaces()

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_spaces_service] = lambda: spaces

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)
    app.dependency_overrides.pop(get_spaces_service, None)


class TestListProductsSignsImageURLs:
    """GET /api/v1/products must sign every URL in image_urls[]."""

    @pytest.mark.asyncio
    async def test_list_products_image_urls_are_presigned(
        self, async_client: AsyncClient
    ) -> None:
        """The list response has each image_urls entry presigned.

        Mocked use case returns a product with two RAW internal-endpoint URLs.
        The router must sign each one (call spaces.generate_download_url per key)
        before returning. If it doesn't, the browser will fail to resolve
        minio:9000 and the image won't render.
        """
        raw_product = _make_product(image_urls=[RAW_URL_1, RAW_URL_2])
        mocked_response = ProductListResponse(
            products=[raw_product],
            total=1,
            skip=0,
            limit=100,
        )

        with patch(
            "prosell.infrastructure.api.routers.product_router.ListProductsUseCase"
        ) as mock_use_case_cls:
            mock_use_case_cls.return_value.execute = AsyncMock(
                return_value=mocked_response,
            )

            response = await async_client.get("/api/v1/products")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert "products" in body
        assert len(body["products"]) == 1
        signed_urls = body["products"][0]["image_urls"]
        assert len(signed_urls) == 2
        # Every URL must be presigned (have X-Amz-Signature)
        for url in signed_urls:
            assert "X-Amz-Signature=" in url, (
                f"Expected presigned URL with X-Amz-Signature, got: {url!r}"
            )
            # And must NOT leak the internal docker network endpoint
            assert "minio:9000" not in url, (
                f"URL leaked internal endpoint, got: {url!r}"
            )


class TestGetProductSignsImageURLs:
    """GET /api/v1/products/{id} must sign every URL in image_urls[]."""

    @pytest.mark.asyncio
    async def test_get_product_image_urls_are_presigned(
        self, async_client: AsyncClient
    ) -> None:
        """The detail response has each image_urls entry presigned.

        Mocked repo returns a Product with RAW internal-endpoint URLs.
        The router must sign each one before returning.
        """
        raw_product = _make_product(image_urls=[RAW_URL_1, RAW_URL_2])
        product_entity = _to_product_entity(raw_product)

        # Patch the repo class the router uses. The router does
        # `SqlAlchemyProductRepository(db)` and then `.get_by_id(...)`; we
        # intercept the class so the instance it creates has our async mock.
        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value.get_by_id = AsyncMock(
                return_value=product_entity,
            )
            mock_repo_cls.return_value.increment_view_count = AsyncMock(
                return_value=None,
            )

            response = await async_client.get(f"/api/v1/products/{TEST_PRODUCT_ID}")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        signed_urls = body["image_urls"]
        assert len(signed_urls) == 2
        for url in signed_urls:
            assert "X-Amz-Signature=" in url, (
                f"Expected presigned URL with X-Amz-Signature, got: {url!r}"
            )
            assert "minio:9000" not in url, (
                f"URL leaked internal endpoint, got: {url!r}"
            )


def _to_product_entity(response: ProductResponse) -> Product:
    """Convert a ProductResponse back to a minimal Product entity for repo mocks."""
    from datetime import UTC, datetime

    return Product(
        id=response.id,
        tenant_id=response.tenant_id,
        organization_id=response.organization_id,
        category_id=response.category_id,
        title=response.title,
        price_cents=response.price_cents,
        currency=response.currency,
        condition=ProductCondition(response.condition),
        status=ProductStatus(response.status),
        image_urls=response.image_urls,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
