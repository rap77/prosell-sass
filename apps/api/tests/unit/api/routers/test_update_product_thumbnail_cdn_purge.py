"""Unit tests for PATCH /api/v1/products/{id} — FR4.1 CDN purge on
thumbnail replacement.

Pins the fast-follow fix to intent `260920-catalog-image-performanc`: when
a PATCH replaces `thumbnail_image_key` with a new value, the superseded
key must be invalidated on the CDN (and deleted from storage) via
`PurgeProductImageUseCase` — the same use case `DELETE
/products/{id}/images/{key}` already uses (see
`test_delete_product_image.py`).

Deliberately scoped to `thumbnail_image_key` only: unlike `cover_image_key`
and `image_urls`, the private thumbnail derivative is never shared with the
gallery, so the old key is always safely orphaned once superseded. These
tests do NOT cover `cover_image_key`/`image_urls` replacement — that is out
of scope by design (see `product_router.py::update_product` docstring).
"""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.product import Product
from prosell.domain.entities.user import User
from prosell.domain.ports.i_cdn_invalidator import ICdnInvalidator
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
TEST_PRODUCT_ID = UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
OLD_THUMB_KEY = f"orgs/{TEST_TENANT_ID}/products/{TEST_PRODUCT_ID}-thumb-old.webp"
NEW_THUMB_KEY = f"orgs/{TEST_TENANT_ID}/products/{TEST_PRODUCT_ID}-thumb-new.webp"

_MocksFixture = tuple[AsyncClient, AsyncMock, AsyncMock, AsyncMock]


def _category_without_template() -> SimpleNamespace:
    """A category whose presentation declares no title template — the
    use case's title recomposition becomes a no-op, keeping these tests
    focused on thumbnail/CDN behavior alone."""
    return SimpleNamespace(presentation=None)


def _make_user() -> User:
    return User(
        id=TEST_USER_ID,
        email="t@example.com",
        full_name="Test",
        tenant_id=TEST_TENANT_ID,
    )


def _make_product(*, thumbnail_image_key: str | None) -> Product:
    return Product(
        id=TEST_PRODUCT_ID,
        tenant_id=TEST_TENANT_ID,
        organization_id=TEST_ORG_ID,
        category_id=TEST_CATEGORY_ID,
        title="Test",
        price_cents=1000,
        currency="USD",
        condition=ProductCondition.USED,
        status=ProductStatus.DRAFT,
        image_urls=[],
        thumbnail_image_key=thumbnail_image_key,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
async def async_client_with_mocks() -> AsyncGenerator[_MocksFixture]:
    """Async client with spaces, invalidator, dispatcher, and session
    mocked via dependency overrides. The product/category repos are
    patched per-test via `with patch(...)`, mirroring
    `test_delete_product_image.py` and
    `test_update_product_cover_legacy_data.py`."""
    user = _make_user()
    spaces = AsyncMock()
    spaces.delete_file = AsyncMock(return_value=True)

    invalidator = AsyncMock(spec=ICdnInvalidator)
    invalidator.invalidate_key = AsyncMock(return_value=None)

    dispatcher = AsyncMock(spec=ITaskDispatcher)

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_spaces_service] = lambda: spaces
    app.dependency_overrides[get_cdn_invalidator] = lambda: invalidator
    app.dependency_overrides[get_task_dispatcher] = lambda: dispatcher

    async def _session_stub():
        yield AsyncMock()

    app.dependency_overrides[get_async_session] = _session_stub

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, spaces, invalidator, dispatcher

    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)
    app.dependency_overrides.pop(get_spaces_service, None)
    app.dependency_overrides.pop(get_cdn_invalidator, None)
    app.dependency_overrides.pop(get_task_dispatcher, None)
    app.dependency_overrides.pop(get_async_session, None)


class TestUpdateProductPurgesSupersededThumbnail:
    """FR4.1 — replacing thumbnail_image_key purges the OLD key."""

    @pytest.mark.asyncio
    async def test_patch_new_thumbnail_key_purges_old_key(
        self, async_client_with_mocks: _MocksFixture
    ) -> None:
        client, _, invalidator, dispatcher = async_client_with_mocks
        product = _make_product(thumbnail_image_key=OLD_THUMB_KEY)

        with (
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
            ) as mock_repo_cls,
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyCategoryRepository"
            ) as mock_cat_cls,
        ):
            mock_repo = mock_repo_cls.return_value
            mock_repo.get_by_id = AsyncMock(return_value=product)
            mock_repo.update = AsyncMock(return_value=product)
            mock_cat_cls.return_value.get_by_id_or_global = AsyncMock(
                return_value=_category_without_template()
            )

            response = await client.patch(
                f"/api/v1/products/{TEST_PRODUCT_ID}",
                json={"thumbnail_image_key": NEW_THUMB_KEY},
            )

        assert response.status_code == status.HTTP_200_OK, response.text
        assert response.json()["thumbnail_image_key"] == NEW_THUMB_KEY
        # The superseded key — not the new one — is what gets purged.
        invalidator.invalidate_key.assert_awaited_once_with(OLD_THUMB_KEY)
        dispatcher.dispatch_cdn_purge.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_patch_same_thumbnail_key_does_not_purge(
        self, async_client_with_mocks: _MocksFixture
    ) -> None:
        """Re-sending the SAME key (no-op from the client's point of
        view) must not trigger a purge — nothing was superseded."""
        client, _, invalidator, dispatcher = async_client_with_mocks
        product = _make_product(thumbnail_image_key=OLD_THUMB_KEY)

        with (
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
            ) as mock_repo_cls,
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyCategoryRepository"
            ) as mock_cat_cls,
        ):
            mock_repo = mock_repo_cls.return_value
            mock_repo.get_by_id = AsyncMock(return_value=product)
            mock_repo.update = AsyncMock(return_value=product)
            mock_cat_cls.return_value.get_by_id_or_global = AsyncMock(
                return_value=_category_without_template()
            )

            response = await client.patch(
                f"/api/v1/products/{TEST_PRODUCT_ID}",
                json={"thumbnail_image_key": OLD_THUMB_KEY},
            )

        assert response.status_code == status.HTTP_200_OK, response.text
        invalidator.invalidate_key.assert_not_awaited()
        dispatcher.dispatch_cdn_purge.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_patch_first_thumbnail_ever_does_not_purge(
        self, async_client_with_mocks: _MocksFixture
    ) -> None:
        """A product that never had a thumbnail before (None -> new
        key) has nothing to supersede — no purge, since there is no
        old key to invalidate."""
        client, _, invalidator, dispatcher = async_client_with_mocks
        product = _make_product(thumbnail_image_key=None)

        with (
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
            ) as mock_repo_cls,
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyCategoryRepository"
            ) as mock_cat_cls,
        ):
            mock_repo = mock_repo_cls.return_value
            mock_repo.get_by_id = AsyncMock(return_value=product)
            mock_repo.update = AsyncMock(return_value=product)
            mock_cat_cls.return_value.get_by_id_or_global = AsyncMock(
                return_value=_category_without_template()
            )

            response = await client.patch(
                f"/api/v1/products/{TEST_PRODUCT_ID}",
                json={"thumbnail_image_key": NEW_THUMB_KEY},
            )

        assert response.status_code == status.HTTP_200_OK, response.text
        assert response.json()["thumbnail_image_key"] == NEW_THUMB_KEY
        invalidator.invalidate_key.assert_not_awaited()
        dispatcher.dispatch_cdn_purge.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_patch_without_thumbnail_field_does_not_purge(
        self, async_client_with_mocks: _MocksFixture
    ) -> None:
        """PATCH semantics: omitting thumbnail_image_key from the body
        means unchanged — no purge should fire."""
        client, _, invalidator, dispatcher = async_client_with_mocks
        product = _make_product(thumbnail_image_key=OLD_THUMB_KEY)

        with (
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyProductRepository"
            ) as mock_repo_cls,
            patch(
                "prosell.infrastructure.api.routers.product_router.SqlAlchemyCategoryRepository"
            ) as mock_cat_cls,
        ):
            mock_repo = mock_repo_cls.return_value
            mock_repo.get_by_id = AsyncMock(return_value=product)
            mock_repo.update = AsyncMock(return_value=product)
            mock_cat_cls.return_value.get_by_id_or_global = AsyncMock(
                return_value=_category_without_template()
            )

            response = await client.patch(
                f"/api/v1/products/{TEST_PRODUCT_ID}",
                json={"title": "Renamed, thumbnail untouched"},
            )

        assert response.status_code == status.HTTP_200_OK, response.text
        assert response.json()["thumbnail_image_key"] == OLD_THUMB_KEY
        invalidator.invalidate_key.assert_not_awaited()
        dispatcher.dispatch_cdn_purge.assert_not_awaited()
