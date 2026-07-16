"""Unit tests for product router — image_urls are returned as bare keys.

The DB stores raw S3 storage keys (e.g. `orgs/<tenant>/vehicles/<file>.jpg`).
After the migration to keys-only-on-disk, the list and detail endpoints
return the keys verbatim — signing happens ONLY on the dedicated
`GET /api/v1/products/{id}/image-urls` endpoint, where the browser fetches
a fresh signed URL on demand.

This file pins the contract:
  - GET /products            → image_urls contains bare keys (no scheme, no ?X-Amz-)
  - GET /products/{id}       → image_urls contains bare keys (no scheme, no ?X-Amz-)
  - GET /products/{id}/image-urls is the single signing path (covered in
    test_get_product_image_urls.py and test_image_router_signed_url.py).
"""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.product.response import ProductResponse
from prosell.application.use_cases.product.list_products import (
    ProductListResponse,
)
from prosell.domain.entities.product import Product
from prosell.domain.entities.user import User
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
)
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session

TEST_TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
TEST_USER_ID = UUID("22222222-2222-2222-2222-222222222222")
TEST_ORG_ID = UUID("33333333-3333-3333-3333-333333333333")
TEST_CATEGORY_ID = UUID("44444444-4444-4444-4444-444444444444")
TEST_PRODUCT_ID = UUID("55555555-5555-5555-5555-555555555555")

# Raw storage keys as they are stored in the DB (no scheme, no query string).
BARE_KEY_1 = f"orgs/{TEST_TENANT_ID}/vehicles/key1.jpg"
BARE_KEY_2 = f"orgs/{TEST_TENANT_ID}/vehicles/key2.jpg"


def _make_user() -> User:
    return User(
        id=TEST_USER_ID,
        email="test@example.com",
        full_name="Test User",
        tenant_id=TEST_TENANT_ID,
    )


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
        published_to_marketplace=False,
        view_count=0,
        favorite_count=0,
        created_at="2026-01-01T00:00:00Z",  # type: ignore[arg-type]
        updated_at="2026-01-01T00:00:00Z",  # type: ignore[arg-type]
    )


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient]:
    """Async client with auth overridden (no spaces service needed post-fix)."""
    user = _make_user()
    db = AsyncMock(spec=AsyncSession)
    db.execute = AsyncMock(return_value=[])

    async def override_session() -> AsyncGenerator[AsyncSession]:
        yield db

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_async_session] = override_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)
    app.dependency_overrides.pop(get_async_session, None)


def _assert_bare_key(url: str) -> None:
    """A bare storage key has no scheme and no query string."""
    assert "://" not in url, f"Expected bare key (no scheme), got: {url!r}"
    assert "?" not in url, f"Expected bare key (no query), got: {url!r}"
    assert "X-Amz-" not in url, f"Expected bare key (no AWS sig), got: {url!r}"


class TestListProductsReturnsBareKeys:
    """GET /api/v1/products must return image_urls as bare storage keys."""

    @pytest.mark.asyncio
    async def test_list_products_image_urls_are_bare_keys(self, async_client: AsyncClient) -> None:
        """The list response contains the storage keys verbatim.

        The DB has bare keys. The router must NOT sign them here —
        signing happens only on the dedicated /image-urls endpoint.
        """
        raw_product = _make_product(image_urls=[BARE_KEY_1, BARE_KEY_2])
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
        returned_urls = body["products"][0]["image_urls"]
        assert returned_urls == [
            BARE_KEY_1,
            BARE_KEY_2,
        ], f"List should return bare keys verbatim, got: {returned_urls!r}"
        for url in returned_urls:
            _assert_bare_key(url)


class TestGetProductReturnsBareKeys:
    """GET /api/v1/products/{id} must return image_urls as bare storage keys."""

    @pytest.mark.asyncio
    async def test_get_product_image_urls_are_bare_keys(self, async_client: AsyncClient) -> None:
        """The detail response contains the storage keys verbatim."""
        raw_product = _make_product(image_urls=[BARE_KEY_1, BARE_KEY_2])
        product_entity = _to_product_entity(raw_product)

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
        returned_urls = body["image_urls"]
        assert returned_urls == [
            BARE_KEY_1,
            BARE_KEY_2,
        ], f"Detail should return bare keys verbatim, got: {returned_urls!r}"
        for url in returned_urls:
            _assert_bare_key(url)


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
