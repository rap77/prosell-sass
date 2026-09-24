"""Unit tests for DELETE /api/v1/products/{id}/images/{key}.

Pins FR4 (image replacement/deletion invalidates the CDN cache with
compensation) at the HTTP boundary. The orchestration lives in
`PurgeProductImageUseCase` (covered in
`test_purge_product_image.py`); these tests confirm the handler wires
the use case correctly:

- Authorization mirrors the single-product endpoint
  (tenant-scoped for non-admins, super_admin can target any tenant).
- Cross-tenant keys are rejected with 422 (defense in depth).
- The handler removes the key from `image_urls` AND clears
  `cover_image_key` / `thumbnail_image_key` if they pointed at the
  same key.
- The endpoint returns 200 with `purge_outcome` set to one of the
  three labels in NFR4.2, regardless of whether the synchronous CDN
  purge succeeded.
- Storage-level calls and CDN invalidation are mocked via dependency
  overrides — no real HTTP / Taskiq / S3 traffic in tests.
"""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.application.use_cases.product.purge_product_image import (
    PURGE_OUTCOME_QUEUED_RETRY,
    PURGE_OUTCOME_SUCCESS,
)
from prosell.domain.entities.product import Product
from prosell.domain.entities.user import User
from prosell.domain.ports.i_cdn_invalidator import (
    CdnInvalidationError,
    ICdnInvalidator,
)
from prosell.domain.ports.i_task_dispatcher import ITaskDispatcher
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import (
    get_async_session,
    get_cdn_invalidator,
    get_current_auth_user_from_cookie,
    get_spaces_service,
    get_task_dispatcher,
)
from prosell.infrastructure.api.main import app

TEST_TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
TEST_USER_ID = UUID("22222222-2222-2222-2222-222222222222")
TEST_ORG_ID = UUID("33333333-3333-3333-3333-333333333333")
TEST_CATEGORY_ID = UUID("44444444-4444-4444-4444-444444444444")
TEST_PRODUCT_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
THUMB_KEY = f"orgs/{TEST_TENANT_ID}/products/{TEST_PRODUCT_ID}-thumb.webp"
GALLERY_KEY = f"orgs/{TEST_TENANT_ID}/products/{TEST_PRODUCT_ID}.webp"

# Type alias used as the test fixture's return tuple.
_MocksFixture = tuple[AsyncClient, AsyncMock, AsyncMock, AsyncMock, AsyncMock]


def _make_user() -> User:
    return User(
        id=TEST_USER_ID,
        email="t@example.com",
        full_name="Test",
        tenant_id=TEST_TENANT_ID,
    )


def _make_product() -> Product:
    return Product(
        id=TEST_PRODUCT_ID,
        tenant_id=TEST_TENANT_ID,
        organization_id=TEST_ORG_ID,
        category_id=TEST_CATEGORY_ID,
        title="Test",
        price_cents=1000,
        currency="USD",
        condition=ProductCondition.USED,
        status=ProductStatus.PUBLISHED,
        image_urls=[THUMB_KEY, GALLERY_KEY],
        cover_image_key=THUMB_KEY,
        thumbnail_image_key=THUMB_KEY,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
async def async_client_with_mocks() -> AsyncGenerator[_MocksFixture]:
    """Async client with product repo, spaces, invalidator, dispatcher mocked.

    Returns (client, product_repo, spaces, invalidator, dispatcher). The
    product repo is a per-test patched instance — the caller is expected
    to use `with patch(...)` to swap in the desired return values for
    each test, mirroring the existing test_get_product_image_urls.py
    pattern.
    """
    user = _make_user()
    spaces = AsyncMock()
    spaces.delete_file = AsyncMock(return_value=True)

    invalidator = AsyncMock(spec=ICdnInvalidator)
    invalidator.invalidate_key = AsyncMock(return_value=None)

    dispatcher = AsyncMock(spec=ITaskDispatcher)

    product_repo = AsyncMock()

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_spaces_service] = lambda: spaces
    app.dependency_overrides[get_cdn_invalidator] = lambda: invalidator
    app.dependency_overrides[get_task_dispatcher] = lambda: dispatcher

    async def _session_stub():
        yield AsyncMock()

    app.dependency_overrides[get_async_session] = _session_stub

    # We patch the repo class via `with patch(...)` in each test, same
    # pattern as test_get_product_image_urls.py.
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, product_repo, spaces, invalidator, dispatcher

    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)
    app.dependency_overrides.pop(get_spaces_service, None)
    app.dependency_overrides.pop(get_cdn_invalidator, None)
    app.dependency_overrides.pop(get_task_dispatcher, None)
    app.dependency_overrides.pop(get_async_session, None)


class TestDeleteProductImageSuccessPath:
    """FR4.3 — synchronous with client confirmation; NFR4.2 outcome label."""

    @pytest.mark.asyncio
    async def test_returns_purge_outcome_success(
        self, async_client_with_mocks: _MocksFixture
    ) -> None:
        client, product_repo, _, invalidator, dispatcher = async_client_with_mocks
        product = _make_product()
        product_repo.get_by_id = AsyncMock(return_value=product)
        product_repo.update = AsyncMock(return_value=product)

        with (
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository",
                return_value=product_repo,
            ),
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyOrganizationRepository",
                return_value=AsyncMock(get_by_tenant_id=AsyncMock(return_value=None)),
            ),
        ):
            response = await client.delete(f"/api/v1/products/{TEST_PRODUCT_ID}/images/{THUMB_KEY}")

        assert response.status_code == status.HTTP_200_OK, response.text
        body = response.json()
        assert body["product_id"] == str(TEST_PRODUCT_ID)
        assert body["deleted_key"] == THUMB_KEY
        assert body["purge_outcome"] == PURGE_OUTCOME_SUCCESS
        # CDN purge attempted for the deleted key.
        invalidator.invalidate_key.assert_awaited_once_with(THUMB_KEY)
        # No retry on success.
        dispatcher.dispatch_cdn_purge.assert_not_awaited()


class TestDeleteProductImageClearsCoverAndThumbnail:
    """Defense in depth: removing the cover or thumbnail must clear
    the matching pointer so the product never advertises a deleted
    image."""

    @pytest.mark.asyncio
    async def test_removes_key_from_image_urls_and_pointer_fields(
        self, async_client_with_mocks: _MocksFixture
    ) -> None:
        client, product_repo, _, _, _ = async_client_with_mocks
        product = _make_product()
        product_repo.get_by_id = AsyncMock(return_value=product)
        product_repo.update = AsyncMock(return_value=product)

        from unittest.mock import patch as _patch

        with (
            _patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository",
                return_value=product_repo,
            ),
            _patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyOrganizationRepository",
                return_value=AsyncMock(get_by_tenant_id=AsyncMock(return_value=None)),
            ),
        ):
            response = await client.delete(f"/api/v1/products/{TEST_PRODUCT_ID}/images/{THUMB_KEY}")

        assert response.status_code == status.HTTP_200_OK
        # The handler fetched the product, mutated its collections, and
        # persisted the result.
        update_args = product_repo.update.await_args
        assert update_args is not None, "handler did not persist the product"
        updated_product = update_args.args[0]
        assert THUMB_KEY not in updated_product.image_urls
        # Both pointer fields cleared — THUMB_KEY was both the cover
        # AND the thumbnail in the fixture.
        assert updated_product.cover_image_key is None
        assert updated_product.thumbnail_image_key is None
        # GALLERY_KEY stays in the gallery.
        assert GALLERY_KEY in updated_product.image_urls


class TestDeleteProductImageQueuedRetry:
    """NFR3.1 / NFR3.2 — handler returns 2xx even when CDN purge
    fails; the dispatcher receives a retry task for the same key."""

    @pytest.mark.asyncio
    async def test_returns_200_with_queued_retry_label(
        self, async_client_with_mocks: _MocksFixture
    ) -> None:
        client, product_repo, _, invalidator, dispatcher = async_client_with_mocks
        product = _make_product()
        product_repo.get_by_id = AsyncMock(return_value=product)
        product_repo.update = AsyncMock(return_value=product)
        invalidator.invalidate_key = AsyncMock(side_effect=CdnInvalidationError("cdn provider 500"))

        from unittest.mock import patch as _patch

        with (
            _patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository",
                return_value=product_repo,
            ),
            _patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyOrganizationRepository",
                return_value=AsyncMock(get_by_tenant_id=AsyncMock(return_value=None)),
            ),
        ):
            response = await client.delete(f"/api/v1/products/{TEST_PRODUCT_ID}/images/{THUMB_KEY}")

        # FR4.3 — the client gets a 2xx because the operation is in
        # flight; the cache eviction happens via the worker.
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["purge_outcome"] == PURGE_OUTCOME_QUEUED_RETRY
        # Retry dispatched.
        dispatcher.dispatch_cdn_purge.assert_awaited_once_with(THUMB_KEY)


class TestDeleteProductImageRejectsCrossTenantKey:
    """NFR2.2 — cross-tenant keys never reach the CDN purge path."""

    @pytest.mark.asyncio
    async def test_cross_tenant_key_returns_422(
        self, async_client_with_mocks: _MocksFixture
    ) -> None:
        client, product_repo, _, invalidator, dispatcher = async_client_with_mocks
        product = _make_product()
        product_repo.get_by_id = AsyncMock(return_value=product)
        product_repo.update = AsyncMock(return_value=product)

        cross_tenant = "orgs/99999999-9999-9999-9999-999999999999/products/sneaky.webp"

        from unittest.mock import patch as _patch

        with (
            _patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository",
                return_value=product_repo,
            ),
            _patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyOrganizationRepository",
                return_value=AsyncMock(get_by_tenant_id=AsyncMock(return_value=None)),
            ),
        ):
            response = await client.delete(
                f"/api/v1/products/{TEST_PRODUCT_ID}/images/{cross_tenant}"
            )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        # CDN purge never invoked for the foreign tenant key.
        invalidator.invalidate_key.assert_not_awaited()
        dispatcher.dispatch_cdn_purge.assert_not_awaited()


class TestDeleteProductImageAuditLogContract:
    """NFR4.2 — audit log records the outcome; the signed URL and raw
    key are never echoed back to the caller (the `deleted_key` field
    is the BARE key, which is not secret, but the response must NOT
    contain the signed CDN URL)."""

    @pytest.mark.asyncio
    async def test_response_omits_signed_url(self, async_client_with_mocks: _MocksFixture) -> None:
        client, product_repo, _, _, _ = async_client_with_mocks
        product = _make_product()
        product_repo.get_by_id = AsyncMock(return_value=product)
        product_repo.update = AsyncMock(return_value=product)

        from unittest.mock import patch as _patch

        with (
            _patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository",
                return_value=product_repo,
            ),
            _patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyOrganizationRepository",
                return_value=AsyncMock(get_by_tenant_id=AsyncMock(return_value=None)),
            ),
        ):
            response = await client.delete(f"/api/v1/products/{TEST_PRODUCT_ID}/images/{THUMB_KEY}")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        # The response exposes the bare key (storage layer is opaque
        # to the caller; same convention as POST /images/upload). It
        # does NOT expose the signed URL — that would be redundant
        # for the caller (which already knows the key) and risky if
        # logged.
        assert body["deleted_key"] == THUMB_KEY
        assert "X-Amz-Signature" not in response.text
