"""Unit tests for GET /api/v1/products/{id}/image-urls — fallback to attrs.image_urls.

Regression for the bug where the endpoint only read `product.image_urls` (the
top-level column) and ignored `product.attributes.image_urls` (the legacy
nested field). Legacy products have URLs ONLY in the nested field, so they
returned `{"images": []}`, and the frontend fell back to the RAW URL (e.g.
`http://minio:9000/...`), which the browser rejected (hostname not in
`next.config.ts` allowlist).

The endpoint must:
  1. Read BOTH `product.image_urls` AND `product.attributes.image_urls`.
  2. Dedupe (an URL appearing in both is signed once, not twice).
  3. Extract the storage key from each URL by stripping `endpoint + bucket/`.
  4. Filter by tenant prefix AFTER extraction (defense in depth).
  5. Drop unparseable URLs (no bucket marker) — fail-closed.
  6. Sign via `spaces.generate_download_url(key)` per surviving key.
"""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.product import Product
from prosell.domain.entities.user import User
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_spaces_service,
)
from prosell.infrastructure.api.main import app

TEST_TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
TEST_OTHER_TENANT_ID = UUID("99999999-9999-9999-9999-999999999999")
TEST_USER_ID = UUID("22222222-2222-2222-2222-222222222222")
TEST_ORG_ID = UUID("33333333-3333-3333-3333-333333333333")
TEST_CATEGORY_ID = UUID("44444444-4444-4444-4444-444444444444")
TEST_PRODUCT_ID = UUID("9d977fb6-6802-4789-8ba7-cbf5bac7f23b")
BUCKET = "prosell-assets"


def _make_user(tenant_id: UUID = TEST_TENANT_ID) -> User:
    return User(
        id=TEST_USER_ID,
        email="test@example.com",
        full_name="Test User",
        tenant_id=tenant_id,
    )


def _make_spaces(sign_map: dict[str, str] | None = None) -> AsyncMock:
    """Spaces mock that signs each key it's called with.

    Defaults: every key is signed into a deterministic localhost URL with a
    dummy `X-Amz-Signature` query string so tests can assert presigned output.
    For tests that need a strict allowlist (e.g. to assert cross-tenant
    filtering), pass `sign_map={key: signed_url}`.
    """
    spaces = AsyncMock()
    spaces.bucket = BUCKET
    if sign_map is None:
        spaces.generate_download_url = AsyncMock(
            side_effect=lambda key: (
                f"http://localhost:9000/{BUCKET}/{key}"
                "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=deadbeef"
            )
        )
    else:
        spaces.generate_download_url = AsyncMock(side_effect=lambda key: sign_map[key])
    return spaces


def _make_product_entity(
    *,
    image_urls: list[str] | None = None,
    attributes: dict[str, object] | None = None,
) -> Product:
    """Build a minimal Product entity for repo mocks."""
    from datetime import UTC, datetime

    return Product(
        id=TEST_PRODUCT_ID,
        tenant_id=TEST_TENANT_ID,
        organization_id=TEST_ORG_ID,
        category_id=TEST_CATEGORY_ID,
        title="Test Product",
        price_cents=10000,
        currency="USD",
        condition=ProductCondition.USED,
        status=ProductStatus.PUBLISHED,
        image_urls=image_urls or [],
        attributes=attributes or {},
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
async def async_client_with_spaces() -> AsyncGenerator[tuple[AsyncClient, AsyncMock]]:
    """Async client with auth and spaces overridden; yields (client, spaces)."""
    user = _make_user()
    spaces = _make_spaces()

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_spaces_service] = lambda: spaces

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, spaces

    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)
    app.dependency_overrides.pop(get_spaces_service, None)


class TestGetProductImageUrlsFallbackToAttributes:
    """The endpoint must sign URLs from BOTH product.image_urls AND attributes.image_urls."""

    @pytest.mark.asyncio
    async def test_signs_urls_from_attributes_when_top_level_is_empty(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        """A product with empty top-level image_urls but populated
        attributes.image_urls MUST return a signed URL for each legacy entry.
        """
        client, _ = async_client_with_spaces
        legacy_url = (
            f"http://minio:9000/{BUCKET}/orgs/{TEST_TENANT_ID}/vehicles/legacy1.jpg"
        )
        product = _make_product_entity(
            image_urls=[],
            attributes={"image_urls": [legacy_url]},
        )

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)

            response = await client.get(f"/api/v1/products/{TEST_PRODUCT_ID}/image-urls")

        assert response.status_code == status.HTTP_200_OK, response.text
        body = response.json()
        assert body["product_id"] == str(TEST_PRODUCT_ID)
        assert len(body["images"]) == 1, (
            f"Expected 1 signed image from attributes.image_urls, got: {body['images']!r}"
        )
        signed = body["images"][0]
        assert signed["key"] == f"orgs/{TEST_TENANT_ID}/vehicles/legacy1.jpg"
        assert "X-Amz-Signature=" in signed["url"]
        assert "minio:9000" not in signed["url"], (
            f"Signed URL still leaks internal endpoint: {signed['url']!r}"
        )
        assert signed["url"].startswith("http://localhost:9000/"), (
            f"Signed URL should target the public endpoint (localhost:9000), got: "
            f"{signed['url']!r}"
        )

    @pytest.mark.asyncio
    async def test_signs_urls_from_both_top_level_and_attributes(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        """When both sources have URLs, every one is signed (deduped)."""
        client, _ = async_client_with_spaces
        url_top = f"http://minio:9000/{BUCKET}/orgs/{TEST_TENANT_ID}/vehicles/top.jpg"
        url_attr = f"http://minio:9000/{BUCKET}/orgs/{TEST_TENANT_ID}/vehicles/attr.jpg"
        product = _make_product_entity(
            image_urls=[url_top],
            attributes={"image_urls": [url_attr]},
        )

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)

            response = await client.get(f"/api/v1/products/{TEST_PRODUCT_ID}/image-urls")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        keys = [img["key"] for img in body["images"]]
        assert keys == [
            f"orgs/{TEST_TENANT_ID}/vehicles/top.jpg",
            f"orgs/{TEST_TENANT_ID}/vehicles/attr.jpg",
        ], f"Expected 2 distinct signed keys, got: {keys!r}"

    @pytest.mark.asyncio
    async def test_dedupes_duplicate_urls_across_sources(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        """A URL present in BOTH the top-level column and attributes is signed once."""
        client, _ = async_client_with_spaces
        shared_url = f"http://minio:9000/{BUCKET}/orgs/{TEST_TENANT_ID}/vehicles/shared.jpg"
        product = _make_product_entity(
            image_urls=[shared_url],
            attributes={"image_urls": [shared_url]},
        )

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)

            response = await client.get(f"/api/v1/products/{TEST_PRODUCT_ID}/image-urls")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body["images"]) == 1, (
            f"Duplicate URL was signed twice (no dedupe), got: {body['images']!r}"
        )


class TestGetProductImageUrlsSecurityFilters:
    """The endpoint must enforce tenant-prefix and fail-closed parsing AFTER merging sources."""

    @pytest.mark.asyncio
    async def test_drops_cross_tenant_urls_from_attributes(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        """A URL in attributes.image_urls that points to another tenant MUST be dropped.

        Defense in depth: even though attributes may be attacker-influenced in
        some flows, the signer MUST filter by tenant prefix to prevent
        cross-tenant presigned URL minting.
        """
        # Fixture is consumed by side-effect (sets auth + spaces dependency_overrides).
        _, _ = async_client_with_spaces
        # Use a strict allowlist so any unauthorized call to generate_download_url raises.
        spaces = _make_spaces(
            sign_map={
                f"orgs/{TEST_TENANT_ID}/vehicles/mine.jpg": (
                    f"http://localhost:9000/{BUCKET}/orgs/{TEST_TENANT_ID}/vehicles/mine.jpg"
                    "?X-Amz-Signature=ok"
                )
            }
        )
        app.dependency_overrides[get_spaces_service] = lambda: spaces

        product = _make_product_entity(
            image_urls=[],
            attributes={
                "image_urls": [
                    f"http://minio:9000/{BUCKET}/orgs/{TEST_TENANT_ID}/vehicles/mine.jpg",
                    f"http://minio:9000/{BUCKET}/orgs/{TEST_OTHER_TENANT_ID}/vehicles/secret.jpg",
                ]
            },
        )

        try:
            with patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
            ) as mock_repo_cls:
                mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)
                # Re-use the same transport as the fixture's client
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.get(
                        f"/api/v1/products/{TEST_PRODUCT_ID}/image-urls"
                    )
        finally:
            app.dependency_overrides.pop(get_spaces_service, None)

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        keys = [img["key"] for img in body["images"]]
        assert keys == [f"orgs/{TEST_TENANT_ID}/vehicles/mine.jpg"], (
            f"Cross-tenant URL leaked through; got: {keys!r}"
        )
        # And the signer was called exactly once (only the caller-tenant key)
        assert spaces.generate_download_url.await_count == 1

    @pytest.mark.asyncio
    async def test_drops_malformed_url_from_attributes(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        """A URL in attributes.image_urls missing the bucket marker is dropped, not echoed.

        Fail-closed: a malformed URL would otherwise let an attacker smuggle an
        external (un-signed, possibly attacker-controlled) URL into the response,
        bypassing the signing logic and the Next.js image allowlist.
        """
        # Fixture is consumed by side-effect (sets auth + spaces dependency_overrides).
        _, _ = async_client_with_spaces
        spaces = _make_spaces(
            sign_map={
                f"orgs/{TEST_TENANT_ID}/vehicles/ok.jpg": (
                    f"http://localhost:9000/{BUCKET}/orgs/{TEST_TENANT_ID}/vehicles/ok.jpg"
                    "?X-Amz-Signature=ok"
                )
            }
        )
        app.dependency_overrides[get_spaces_service] = lambda: spaces

        product = _make_product_entity(
            image_urls=[],
            attributes={
                "image_urls": [
                    # Well-formed: should be signed
                    f"http://minio:9000/{BUCKET}/orgs/{TEST_TENANT_ID}/vehicles/ok.jpg",
                    # Malformed: no bucket marker. Must be dropped, not echoed.
                    "https://attacker.example.com/sneaky.jpg",
                ]
            },
        )

        try:
            with patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
            ) as mock_repo_cls:
                mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    response = await client.get(
                        f"/api/v1/products/{TEST_PRODUCT_ID}/image-urls"
                    )
        finally:
            app.dependency_overrides.pop(get_spaces_service, None)

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        keys = [img["key"] for img in body["images"]]
        urls = [img["url"] for img in body["images"]]
        # Only the well-formed entry is signed
        assert keys == [f"orgs/{TEST_TENANT_ID}/vehicles/ok.jpg"], (
            f"Malformed URL was not dropped; got: {keys!r}"
        )
        # No external URL is echoed
        assert not any("attacker.example.com" in u for u in urls), (
            f"Attacker URL leaked into response: {urls!r}"
        )
        # Signer called exactly once (only the well-formed key)
        assert spaces.generate_download_url.await_count == 1


class TestGetProductImageUrlsEmpty:
    """When neither source has URLs, return an empty list (not an error)."""

    @pytest.mark.asyncio
    async def test_returns_empty_when_both_sources_empty(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        client, _ = async_client_with_spaces
        product = _make_product_entity(image_urls=[], attributes={})

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)

            response = await client.get(f"/api/v1/products/{TEST_PRODUCT_ID}/image-urls")

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "product_id": str(TEST_PRODUCT_ID),
            "images": [],
        }
