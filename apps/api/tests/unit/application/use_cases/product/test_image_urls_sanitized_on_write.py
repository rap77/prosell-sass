"""Regression tests -- sanitize image_urls on every Product write.

The CSV bulk-upload sanitizer (`CSVImageMapper._sanitize_filename`) was
the original defense against phone-cam-style filenames like `WhatsApp
Image ... (1).jpeg` reaching `product.image_urls`. The post-fix DTO
regex relaxation (`create.py::_STORAGE_KEY_PATTERN`) lets such legacy
keys through for backward compat with already-imported products.

This is a regression vector: a client PATCH that submits the same
un-sanitized key bypasses the CSV path entirely. `normalize_storage_key`
(public helper in `csv_image_mapper`) closes that loop by running the
same per-segment normalization at the use case boundary on every
write, regardless of entry path.

These tests pin the invariant at the use case layer (the canonical
write point). They fail RED if `UpdateProductUseCase` or
`CreateProductUseCase` are ever wired without the `normalize_storage_key`
call -- preventing the production bug from recurring through a future
endpoint that bypasses CSV bulk-upload.
"""

from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.dto.product.update import UpdateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.application.use_cases.product.update_product import (
    UpdateProductUseCase,
)
from prosell.application.use_cases.product.update_product import (
    sanitize_storage_key as normalize_storage_key,
)
from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_condition import ProductCondition

BAD_KEY = (
    "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
    "56e652de-c522-4664-a977-4bb18586f2fa/1FTNR1YV8FKA66889/"
    "WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg"
)
GOOD_KEY = (
    "orgs/56e652de-c522-4664-a977-4bb18586f2fa/vehicles/"
    "56e652de-c522-4664-a977-4bb18586f2fa/1FTNR1YV8FKA66889/"
    "WhatsApp_Image_2026-09-12_at_8.42.31_AM_1_.jpeg"
)


class TestNormalizeStorageKeyHelper:
    """Pure helper contract -- applies only to bare storage keys."""

    def test_sanitizes_bad_storage_key(self) -> None:
        assert normalize_storage_key(BAD_KEY) == GOOD_KEY

    def test_passes_clean_storage_key_unchanged(self) -> None:
        assert normalize_storage_key(GOOD_KEY) == GOOD_KEY

    def test_leaves_https_url_unchanged(self) -> None:
        """Signed/external URLs must NOT be rewritten -- the signer
        treats them as URLs; replacing `:` with `_` would break the
        scheme."""
        url = (
            "https://prosell-assets.atl1.digitaloceanspaces.com/orgs/abc/vehicles/bad name (1).jpeg"
        )
        assert normalize_storage_key(url) == url

    def test_leaves_http_url_unchanged(self) -> None:
        url = "http://minio:9000/orgs/abc/img.jpg"
        assert normalize_storage_key(url) == url

    def test_legacy_vehicles_prefix_sanitized_too(self) -> None:
        bad = "vehicles/56e652de-c522-4664-a977-4bb18586f2fa/bad name.jpg"
        assert normalize_storage_key(bad) == (
            "vehicles/56e652de-c522-4664-a977-4bb18586f2fa/bad_name.jpg"
        )


def _make_existing_product(image_urls: list[str] | None = None) -> Product:
    return Product.create(
        title="Test car",
        price_cents=1_000_000,
        tenant_id=uuid4(),
        organization_id=uuid4(),
        category_id=uuid4(),
        condition=ProductCondition.USED,
        attributes={},
        image_urls=image_urls or [],
    )


class TestUpdateProductSanitizesImageUrls:
    """PATCH via `UpdateProductUseCase` must persist the SANITIZED form,
    not the raw request value. Without the `normalize_storage_key` call,
    a client could re-introduce the legacy phone-cam key shape."""

    @pytest.mark.asyncio
    async def test_patch_persists_sanitized_image_urls(self) -> None:
        existing = _make_existing_product(image_urls=[])
        product_repo = AsyncMock()
        product_repo.get_by_id = AsyncMock(return_value=existing)
        product_repo.update = AsyncMock(return_value=existing)
        category_repo = AsyncMock()
        category_repo.get_by_id_or_global = AsyncMock(
            return_value=type("C", (), {"presentation": None, "tenant_id": None})()
        )

        request = UpdateProductRequest.model_construct(
            image_urls=[BAD_KEY],
            title=None,
            description=None,
            price_cents=None,
            category_id=None,
            condition=None,
            attributes=None,
            cover_image_key=None,
            thumbnail_image_key=None,
            location_city=None,
            location_state=None,
            location_zip=None,
        )
        use_case = UpdateProductUseCase(product_repo, category_repo)
        await use_case.execute(existing.id, existing.tenant_id, request)

        assert existing.image_urls == [GOOD_KEY], (
            f"image_urls must be sanitized before persistence. Got {existing.image_urls!r}"
        )

    @pytest.mark.asyncio
    async def test_patch_sanitizes_cover_and_thumbnail(self) -> None:
        """`cover_image_key` and `thumbnail_image_key` go through the
        same sanitizer, so the cover cross-check (which compares the
        sanitized cover against the sanitized image list) stays
        consistent."""
        existing = _make_existing_product(image_urls=[GOOD_KEY])
        product_repo = AsyncMock()
        product_repo.get_by_id = AsyncMock(return_value=existing)
        product_repo.update = AsyncMock(return_value=existing)
        category_repo = AsyncMock()
        category_repo.get_by_id_or_global = AsyncMock(
            return_value=type("C", (), {"presentation": None, "tenant_id": None})()
        )

        request = UpdateProductRequest.model_construct(
            image_urls=None,
            title=None,
            description=None,
            price_cents=None,
            category_id=None,
            condition=None,
            attributes=None,
            cover_image_key=BAD_KEY,  # raw, bad-char
            thumbnail_image_key=BAD_KEY,
            location_city=None,
            location_state=None,
            location_zip=None,
        )
        use_case = UpdateProductUseCase(product_repo, category_repo)
        await use_case.execute(existing.id, existing.tenant_id, request)

        assert existing.cover_image_key == GOOD_KEY
        assert existing.thumbnail_image_key == GOOD_KEY


class TestCreateProductSanitizesImageUrls:
    """POST via `CreateProductUseCase` must persist the SANITIZED form."""

    @pytest.mark.asyncio
    async def test_create_persists_sanitized_image_urls(self) -> None:
        tenant_id = uuid4()
        organization_id = uuid4()
        created = _make_existing_product(image_urls=[GOOD_KEY])
        product_repo = AsyncMock()
        product_repo.create = AsyncMock(return_value=created)
        category_repo = AsyncMock()
        category_repo.get_by_id_or_global = AsyncMock(
            return_value=type(
                "C",
                (),
                {
                    "presentation": None,
                    "tenant_id": tenant_id,
                    "validate_attributes": lambda _self, _attrs: None,
                },
            )()
        )

        request = CreateProductRequest.model_construct(
            title="New",
            price_cents=1_000_000,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=uuid4(),
            condition=ProductCondition.USED,
            attributes={},
            image_urls=[BAD_KEY],
            cover_image_key=None,
            thumbnail_image_key=None,
            # remaining fields default
        )
        # model_construct skips pydantic validation; provide the
        # required None defaults explicitly so the sanitizer block
        # in the use case doesn't KeyError on a missing attribute.
        request.cover_image_key = None
        request.thumbnail_image_key = None
        request.currency = "USD"
        request.slug = None
        request.description = None
        request.location_city = None
        request.location_state = None
        request.location_zip = None

        use_case = CreateProductUseCase(product_repo, category_repo)
        response = await use_case.execute(request)

        # The use case builds the entity internally; assert via the
        # call to product_repo.create.
        create_call = product_repo.create.await_args
        persisted = create_call.args[0]
        assert persisted.image_urls == [GOOD_KEY], (
            f"image_urls must be sanitized before persistence. Got {persisted.image_urls!r}"
        )
        assert response is not None
