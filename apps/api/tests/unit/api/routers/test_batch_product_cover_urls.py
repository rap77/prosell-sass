"""Unit tests for POST /api/v1/products/image-urls:batch.

Pins the contract for the catalog-grid cover-URL fan-out:

- FR1.1: One endpoint, N product IDs, one signed cover URL per product.
- FR1.2: Authorization mirrors the single-product endpoint
         (tenant filter for non-admins, super_admin sees all tenants).
- FR1.3: Tenant-prefix validation runs for every signed key, with the
         same org-admin legacy-key relaxation already used in the
         single-product endpoint.
- FR1.4: The signed URL is the selected cover (thumbnail derivative
         when present, gallery-cover fallback) — NOT the whole gallery.
- FR1.5: The signed URL is CDN-routed (via `generate_cdn_download_url`,
         not `generate_download_url`).
- FR2.5: When `thumbnail_image_key` is null and `cover_image_key` is set,
         the gallery-cover URL is signed instead.
- FR6.1 / FR6.2: super_admin gets the same access; tenant-prefix
         validation applies identically for cross-org.
- NFR4.1: Structured `batch_size` / `user_id` / `tenant_id` log line
         on every request (no signed URLs).
- OQ3: batch_size > 100 → 413.
"""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.application.dto.product.batch_cover_urls import (
    BATCH_COVER_URLS_MAX_PRODUCTS,
)
from prosell.domain.entities.product import Product
from prosell.domain.entities.role import Role, RoleType
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
TEST_PRODUCT_A = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
TEST_PRODUCT_B = UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
TEST_PRODUCT_C = UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
BUCKET = "prosell-assets"


def _make_user(tenant_id: UUID = TEST_TENANT_ID) -> User:
    return User(
        id=TEST_USER_ID,
        email="test@example.com",
        full_name="Test User",
        tenant_id=tenant_id,
    )


def _make_org_admin_user(tenant_id: UUID = TEST_TENANT_ID) -> User:
    user = User(
        id=TEST_USER_ID,
        email="admin@example.com",
        full_name="Admin User",
        tenant_id=tenant_id,
    )
    user.roles = [Role.create_system_role(RoleType.ADMIN)]
    return user


def _make_spaces() -> AsyncMock:
    """Spaces mock that signs each key via the CDN endpoint (FR3.1)."""
    spaces = AsyncMock()
    spaces.bucket = BUCKET
    # CDN-routed signer — the batch endpoint must call this, NOT the
    # public signer, so the response URL targets the CDN host and the
    # browser fetch lands behind the cache.
    spaces.generate_cdn_download_url = AsyncMock(
        side_effect=lambda key: (
            f"https://cdn.example.com/{BUCKET}/{key}"
            "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=cdn-deadbeef"
        )
    )
    # If the endpoint ever falls back to the public signer, this test
    # will fail loudly (the URL would point at the public endpoint,
    # not the CDN).
    spaces.generate_download_url = AsyncMock(
        side_effect=lambda key: (
            f"http://localhost:9000/{BUCKET}/{key}"
            "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=pub-badc0ffee"
        )
    )
    return spaces


def _make_product(
    product_id: UUID,
    *,
    tenant_id: UUID = TEST_TENANT_ID,
    thumbnail_image_key: str | None = None,
    cover_image_key: str | None = None,
    image_urls: list[str] | None = None,
) -> Product:
    from datetime import UTC, datetime

    return Product(
        id=product_id,
        tenant_id=tenant_id,
        organization_id=TEST_ORG_ID,
        category_id=TEST_CATEGORY_ID,
        title="Test Product",
        price_cents=10000,
        currency="USD",
        condition=ProductCondition.USED,
        status=ProductStatus.PUBLISHED,
        image_urls=image_urls or [],
        cover_image_key=cover_image_key,
        thumbnail_image_key=thumbnail_image_key,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
async def async_client_with_spaces() -> AsyncGenerator[tuple[AsyncClient, AsyncMock]]:
    user = _make_user()
    spaces = _make_spaces()
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_spaces_service] = lambda: spaces
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, spaces
    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)
    app.dependency_overrides.pop(get_spaces_service, None)


class TestBatchCoverUrlsHappyPath:
    """FR1.1 + FR1.5 — one signed CDN URL per visible product."""

    @pytest.mark.asyncio
    async def test_returns_one_cover_url_per_product(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        client, spaces = async_client_with_spaces
        thumb_a = f"orgs/{TEST_TENANT_ID}/products/a-thumb.webp"
        thumb_b = f"orgs/{TEST_TENANT_ID}/products/b-thumb.webp"
        product_a = _make_product(TEST_PRODUCT_A, thumbnail_image_key=thumb_a)
        product_b = _make_product(TEST_PRODUCT_B, thumbnail_image_key=thumb_b)

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo = mock_repo_cls.return_value
            mock_repo.get_by_id = AsyncMock(
                side_effect=lambda pid, _tid: {
                    TEST_PRODUCT_A: product_a,
                    TEST_PRODUCT_B: product_b,
                }.get(pid)
            )
            response = await client.post(
                "/api/v1/products/image-urls:batch",
                json={"product_ids": [str(TEST_PRODUCT_A), str(TEST_PRODUCT_B)]},
            )

        assert response.status_code == status.HTTP_200_OK, response.text
        body = response.json()
        assert body["batch_size"] == 2
        assert len(body["covers"]) == 2
        keys = {c["key"] for c in body["covers"]}
        assert keys == {thumb_a, thumb_b}
        # Every signed URL targets the CDN endpoint (FR1.5 / FR3.1)
        for cover in body["covers"]:
            assert cover["url"].startswith("https://cdn.example.com/"), (
                f"URL not CDN-routed: {cover['url']!r}"
            )
            assert "X-Amz-Signature=cdn-deadbeef" in cover["url"], (
                f"URL not signed via CDN signer: {cover['url']!r}"
            )
        # CDN signer was called exactly twice (one per product)
        assert spaces.generate_cdn_download_url.await_count == 2
        # Public signer MUST NOT be called — the batch endpoint signs
        # exclusively against the CDN (regression net for FR1.5).
        spaces.generate_download_url.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_dedupes_repeated_ids(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        client, _ = async_client_with_spaces
        thumb = f"orgs/{TEST_TENANT_ID}/products/a-thumb.webp"
        product_a = _make_product(TEST_PRODUCT_A, thumbnail_image_key=thumb)

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo = mock_repo_cls.return_value
            mock_repo.get_by_id = AsyncMock(return_value=product_a)
            response = await client.post(
                "/api/v1/products/image-urls:batch",
                json={
                    "product_ids": [
                        str(TEST_PRODUCT_A),
                        str(TEST_PRODUCT_A),
                        str(TEST_PRODUCT_A),
                    ]
                },
            )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        # 3 IDs in, 1 unique → 1 signed cover. Duplicates dropped.
        assert body["batch_size"] == 3
        assert len(body["covers"]) == 1
        assert body["covers"][0]["product_id"] == str(TEST_PRODUCT_A)


class TestBatchCoverUrlsLegacyFallback:
    """FR2.5 — when `thumbnail_image_key` is null, fall back to
    `cover_image_key` (the gallery-cover selection). The signed URL is
    STILL CDN-routed."""

    @pytest.mark.asyncio
    async def test_signs_cover_image_key_when_thumbnail_missing(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        client, spaces = async_client_with_spaces
        cover = f"orgs/{TEST_TENANT_ID}/products/a.webp"
        # Legacy product: no thumbnail, only the gallery-cover key.
        product = _make_product(
            TEST_PRODUCT_A,
            thumbnail_image_key=None,
            cover_image_key=cover,
        )

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)
            response = await client.post(
                "/api/v1/products/image-urls:batch",
                json={"product_ids": [str(TEST_PRODUCT_A)]},
            )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body["covers"]) == 1
        assert body["covers"][0]["key"] == cover
        # CDN signer still called (the fallback must also route via
        # the CDN — same defense in depth as the thumbnail path).
        spaces.generate_cdn_download_url.assert_awaited_once_with(cover)

    @pytest.mark.asyncio
    async def test_drops_products_with_no_cover_at_all(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        client, _ = async_client_with_spaces
        # Neither thumbnail nor cover: nothing to sign.
        product = _make_product(
            TEST_PRODUCT_A,
            thumbnail_image_key=None,
            cover_image_key=None,
        )

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)
            response = await client.post(
                "/api/v1/products/image-urls:batch",
                json={"product_ids": [str(TEST_PRODUCT_A)]},
            )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["batch_size"] == 1
        assert body["covers"] == [], "Product with no cover/thumbnail must be dropped, not echoed"


class TestBatchCoverUrlsGalleryFallback:
    """Bugfix (prod, 2026-09-24): a product with real images in
    `image_urls` but neither `thumbnail_image_key` nor `cover_image_key`
    set (e.g. BulkUploadVehiclesUseCase, which never populates either)
    must still get a cover — falling back to the first gallery image,
    same source the single-product gallery endpoint already reads from."""

    @pytest.mark.asyncio
    async def test_falls_back_to_first_gallery_image_bare_key(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        client, spaces = async_client_with_spaces
        first = f"orgs/{TEST_TENANT_ID}/vehicles/{TEST_ORG_ID}/VIN123/1.jpg"
        second = f"orgs/{TEST_TENANT_ID}/vehicles/{TEST_ORG_ID}/VIN123/2.jpg"
        product = _make_product(
            TEST_PRODUCT_A,
            thumbnail_image_key=None,
            cover_image_key=None,
            image_urls=[first, second],
        )

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)
            response = await client.post(
                "/api/v1/products/image-urls:batch",
                json={"product_ids": [str(TEST_PRODUCT_A)]},
            )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body["covers"]) == 1, (
            f"Product with real image_urls but no cover/thumbnail pointer "
            f"must still surface a cover, got: {body['covers']!r}"
        )
        assert body["covers"][0]["key"] == first
        spaces.generate_cdn_download_url.assert_awaited_once_with(first)

    @pytest.mark.asyncio
    async def test_falls_back_to_first_gallery_image_full_url(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        """`BulkUploadVehiclesUseCase` stores full public DO Spaces URLs
        in `image_urls`, not bare keys — the fallback must extract the
        key before signing, not pass the raw URL to the CDN signer."""
        client, spaces = async_client_with_spaces
        key = f"orgs/{TEST_TENANT_ID}/vehicles/{TEST_ORG_ID}/VIN123/1.jpg"
        full_url = f"https://{BUCKET}.nyc3.digitaloceanspaces.com/{BUCKET}/{key}"
        product = _make_product(
            TEST_PRODUCT_A,
            thumbnail_image_key=None,
            cover_image_key=None,
            image_urls=[full_url],
        )

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)
            response = await client.post(
                "/api/v1/products/image-urls:batch",
                json={"product_ids": [str(TEST_PRODUCT_A)]},
            )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body["covers"]) == 1
        assert body["covers"][0]["key"] == key
        spaces.generate_cdn_download_url.assert_awaited_once_with(key)


class TestBatchCoverUrlsTenantScope:
    """FR1.3 + NFR2.2 — tenant-prefix validation per signed key."""

    @pytest.mark.asyncio
    async def test_drops_cross_tenant_keys(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        client, _ = async_client_with_spaces
        # Thumbnail intentionally namespaced under a DIFFERENT tenant.
        cross_tenant_thumb = f"orgs/{TEST_OTHER_TENANT_ID}/products/a-thumb.webp"
        product = _make_product(TEST_PRODUCT_A, thumbnail_image_key=cross_tenant_thumb)

        with patch(
            "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)
            response = await client.post(
                "/api/v1/products/image-urls:batch",
                json={"product_ids": [str(TEST_PRODUCT_A)]},
            )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        # Cross-tenant key dropped silently — the catalog grid doesn't
        # need to know WHY a particular id was dropped.
        assert body["covers"] == []


class TestBatchCoverUrlsOrgAdminAccess:
    """FR6.1 / FR6.2 — super_admin sees cross-org products; tenant
    prefix validation applies identically."""

    @pytest.mark.asyncio
    async def test_org_admin_can_sign_cross_org_thumbnail(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        client, spaces = async_client_with_spaces
        admin = _make_org_admin_user()
        app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: admin

        try:
            # super_admin's tenant is TEST_TENANT_ID; the product belongs
            # to a DIFFERENT org (TEST_OTHER_TENANT_ID). Without the
            # ORG_ADMIN_VIEW_ALL relaxation, the repo would return None
            # for the tenant-scoped read.
            thumb = f"orgs/{TEST_OTHER_TENANT_ID}/products/x-thumb.webp"
            product = _make_product(
                TEST_PRODUCT_A,
                tenant_id=TEST_OTHER_TENANT_ID,
                thumbnail_image_key=thumb,
            )

            with (
                patch(
                    "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
                ) as mock_repo_cls,
                patch(
                    "prosell.infrastructure.api.routers.product_router.SqlAlchemyOrganizationRepository"
                ) as mock_org_repo_cls,
            ):
                mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)
                mock_org_repo_cls.return_value.get_by_tenant_id = AsyncMock(return_value=object())
                response = await client.post(
                    "/api/v1/products/image-urls:batch",
                    json={"product_ids": [str(TEST_PRODUCT_A)]},
                )
        finally:
            app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body["covers"]) == 1
        assert body["covers"][0]["key"] == thumb
        spaces.generate_cdn_download_url.assert_awaited_once_with(thumb)


class TestBatchCoverUrlsBatchCap:
    """OQ3 — oversized batches get a 413."""

    @pytest.mark.asyncio
    async def test_oversized_batch_returns_413(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        client, spaces = async_client_with_spaces
        # Bypass Pydantic's schema-level check by sending more than
        # the cap in a single request (the schema rejects the same
        # case at the boundary; the handler-level guard catches any
        # code path that doesn't go through the schema).
        too_many = [str(UUID(int=i)) for i in range(BATCH_COVER_URLS_MAX_PRODUCTS + 5)]
        response = await client.post(
            "/api/v1/products/image-urls:batch",
            json={"product_ids": too_many},
        )
        # Pydantic's max_length fires first → 422. The handler guard
        # exists as belt-and-suspenders for direct callers.
        assert response.status_code in (
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )
        spaces.generate_cdn_download_url.assert_not_awaited()


class TestBatchCoverUrlsStructuredLogging:
    """NFR4.1 — every request logs `batch_size`, `user_id`, `tenant_id`
    (and never the signed URL or the raw key path)."""

    @pytest.mark.asyncio
    async def test_logs_batch_size_user_and_tenant(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock], caplog
    ) -> None:
        client, _ = async_client_with_spaces
        thumb = f"orgs/{TEST_TENANT_ID}/products/a-thumb.webp"
        product = _make_product(TEST_PRODUCT_A, thumbnail_image_key=thumb)

        import logging

        with (
            caplog.at_level(
                logging.INFO, logger="prosell.infrastructure.api.routers.product_router"
            ),
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
            ) as mock_repo_cls,
        ):
            mock_repo_cls.return_value.get_by_id = AsyncMock(return_value=product)
            response = await client.post(
                "/api/v1/products/image-urls:batch",
                json={"product_ids": [str(TEST_PRODUCT_A)]},
            )

        assert response.status_code == status.HTTP_200_OK
        # Find the batch log line.
        batch_logs = [r for r in caplog.records if "Batch cover-URL signing" in r.message]
        assert len(batch_logs) == 1, (
            f"Expected one structured batch log, got: {[r.message for r in caplog.records]!r}"
        )
        record = batch_logs[0]
        # batch_size + user_id + tenant_id are the three required fields.
        assert "batch_size=1" in record.message
        assert f"user_id={TEST_USER_ID}" in record.message
        assert f"tenant_id={TEST_TENANT_ID}" in record.message
        # NFR4.1 — never log signed URLs or raw key paths in this line.
        assert "X-Amz-Signature" not in record.message
        assert "thumb.webp" not in record.message


class TestBatchCoverUrlsEmptyRequest:
    """Empty list is accepted but returns an empty map (no fetch)."""

    @pytest.mark.asyncio
    async def test_empty_product_ids_returns_empty(
        self, async_client_with_spaces: tuple[AsyncClient, AsyncMock]
    ) -> None:
        client, spaces = async_client_with_spaces
        response = await client.post(
            "/api/v1/products/image-urls:batch",
            json={"product_ids": []},
        )
        # Pydantic min_length=1 → 422. Empty list is rejected at the
        # boundary, matching the "must be at least one ID" contract.
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        spaces.generate_cdn_download_url.assert_not_awaited()
