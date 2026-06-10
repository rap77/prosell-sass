"""Unit tests for PATCH /api/v1/products/{id} — cover_image_key from legacy data.

Regression for the bug where the PATCH router's cover validator only
checked the top-level `product.image_urls` column and rejected covers
that lived in the legacy `product.attributes.image_urls` location
(pre-migration storage).

The PATCH path that fires from the cover picker:
  - User clicks a tile in `<ProductCoverPicker mode="edit" />`.
  - `setProductCover(id, key)` PATCHes the product with
    `{ cover_image_key: <key> }` (no `image_urls` in the body).
  - Router's check on line ~460: "cover must be in product's CURRENT
    image list". The current implementation reads only the top-level
    column → legacy products 422.

The sign endpoint (GET /image-urls) already merges both sources
(`test_get_product_image_urls.py`), so the picker correctly shows the
legacy images. The PATCH endpoint must merge the same way for the
round-trip to work.

The fix is to extract a small helper that returns the merged
image-key list (top-level + attributes.image_urls, deduped, in the
canonical order) and use it in the router's cover check.
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
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
)
from prosell.infrastructure.api.main import app

TEST_TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
TEST_USER_ID = UUID("22222222-2222-2222-2222-222222222222")
TEST_ORG_ID = UUID("33333333-3333-3333-3333-333333333333")
TEST_CATEGORY_ID = UUID("44444444-4444-4444-4444-444444444444")
TEST_PRODUCT_ID = UUID("9d977fb6-6802-4789-8ba7-cbf5bac7f23b")
LEGACY_KEY = f"orgs/{TEST_TENANT_ID}/vehicles/legacy-cover.jpg"


def _category_without_template() -> SimpleNamespace:
    """A category whose presentation declares no title template.

    The PATCH now delegates to ``UpdateProductUseCase``, which loads the
    category to recompose the title. With ``presentation=None`` the
    recomposition is a no-op (falls back to the existing title), so these
    cover-validation tests assert on cover behavior alone.
    """
    return SimpleNamespace(presentation=None)


def _make_user() -> User:
    return User(
        id=TEST_USER_ID,
        email="test@example.com",
        full_name="Test User",
        tenant_id=TEST_TENANT_ID,
    )


def _make_product(
    *, image_urls: list[str] | None = None, attributes: dict[str, object] | None = None
) -> Product:
    """Product with the desired legacy/modern image-URL split.

    Defaults to a product that has images ONLY in the legacy
    `attributes.image_urls` location — the bug's exact precondition.
    """
    return Product(
        id=TEST_PRODUCT_ID,
        tenant_id=TEST_TENANT_ID,
        organization_id=TEST_ORG_ID,
        category_id=TEST_CATEGORY_ID,
        title="Legacy Product",
        price_cents=10000,
        currency="USD",
        condition=ProductCondition.USED,
        status=ProductStatus.DRAFT,  # editable
        image_urls=image_urls if image_urls is not None else [],
        attributes=attributes or {"image_urls": [LEGACY_KEY]},
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
async def async_client_with_auth() -> AsyncGenerator[AsyncClient]:
    """Auth is overridden; the repo is patched per-test."""
    user = _make_user()
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)


class TestUpdateProductCoverAcceptsLegacyKeys:
    """PATCH cover_image_key pointing to a legacy (attributes.image_urls) key succeeds."""

    @pytest.mark.asyncio
    async def test_patch_cover_with_legacy_attributes_key_succeeds(
        self, async_client_with_auth: AsyncClient
    ) -> None:
        """The product has images ONLY in attributes.image_urls (legacy).
        PATCHing the cover with one of those keys must succeed, NOT 422.

        Bug: the router check used `product.image_urls` only (the empty
        top-level column), so the cover key was rejected. The sign
        endpoint merges both sources; the PATCH endpoint must too.
        """
        product = _make_product(
            image_urls=[],
            attributes={"image_urls": [LEGACY_KEY]},
        )

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

            response = await async_client_with_auth.patch(
                f"/api/v1/products/{TEST_PRODUCT_ID}",
                json={"cover_image_key": LEGACY_KEY},
            )

        assert response.status_code == status.HTTP_200_OK, (
            f"Expected 200 for legacy cover key, got {response.status_code}: "
            f"{response.text!r}. The PATCH validator must merge the legacy "
            f"`attributes.image_urls` source the same way the sign endpoint does."
        )
        body = response.json()
        assert body["cover_image_key"] == LEGACY_KEY

    @pytest.mark.asyncio
    async def test_patch_cover_with_top_level_key_still_works(
        self, async_client_with_auth: AsyncClient
    ) -> None:
        """Sanity check: the fix must not break the modern path.

        A product with images in the top-level column should still
        accept a cover pointing to one of those keys. (This case
        already worked before the fix; the new code must keep it
        working.)
        """
        top_key = f"orgs/{TEST_TENANT_ID}/vehicles/top-cover.jpg"
        product = _make_product(
            image_urls=[top_key],
            attributes={},
        )

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

            response = await async_client_with_auth.patch(
                f"/api/v1/products/{TEST_PRODUCT_ID}",
                json={"cover_image_key": top_key},
            )

        assert response.status_code == status.HTTP_200_OK, response.text
        assert response.json()["cover_image_key"] == top_key

    @pytest.mark.asyncio
    async def test_patch_cover_with_key_in_both_sources_uses_either(
        self, async_client_with_auth: AsyncClient
    ) -> None:
        """A product with the same key in BOTH top-level and attributes
        accepts a cover pointing to that key (deduped)."""
        shared = f"orgs/{TEST_TENANT_ID}/vehicles/shared.jpg"
        product = _make_product(
            image_urls=[shared],
            attributes={"image_urls": [shared]},
        )

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

            response = await async_client_with_auth.patch(
                f"/api/v1/products/{TEST_PRODUCT_ID}",
                json={"cover_image_key": shared},
            )

        assert response.status_code == status.HTTP_200_OK, response.text
        assert response.json()["cover_image_key"] == shared

    @pytest.mark.asyncio
    async def test_patch_cover_with_unknown_key_still_422s(
        self, async_client_with_auth: AsyncClient
    ) -> None:
        """Defense in depth: a key that exists in NEITHER source must
        still be rejected with 422. The fix is about acceptance, not
        about removing the check entirely.
        """
        product = _make_product(
            image_urls=[],
            attributes={"image_urls": [LEGACY_KEY]},
        )

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

            response = await async_client_with_auth.patch(
                f"/api/v1/products/{TEST_PRODUCT_ID}",
                json={"cover_image_key": (f"orgs/{TEST_TENANT_ID}/vehicles/does-not-exist.jpg")},
            )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
