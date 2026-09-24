"""RED tests — thumbnail_image_key must actually persist on create/update.

Fast-follow to intent `260920-catalog-image-performanc`: the private
600x600 thumbnail derivative was generated and uploaded correctly
(`image_router.py::upload_image` returns `thumbnail_key`), but neither
`CreateProductRequest` nor `UpdateProductRequest` exposed the field, so
`Product.thumbnail_image_key` was NEVER written by any code path — the
column existed, the model persisted it, the batch cover-URL endpoint read
it, but nothing ever set it. Confirmed by grep during a staging smoke test:
zero references to `thumbnail_image_key`/`thumbnail_key` anywhere in the
frontend's create/update payload construction.

These tests pin the use-case-level fix: both DTOs accept
`thumbnail_image_key` and both use cases forward it onto the entity.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.dto.product.update import UpdateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.application.use_cases.product.update_product import UpdateProductUseCase
from prosell.domain.entities.category import Category
from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_condition import ProductCondition

THUMB_KEY = "orgs/00000000-0000-0000-0000-000000000001/products/thumb-a-thumb.webp"
OTHER_THUMB_KEY = "orgs/00000000-0000-0000-0000-000000000001/products/thumb-b-thumb.webp"


class TestCreateProductPersistsThumbnailImageKey:
    def test_dto_accepts_thumbnail_image_key(self) -> None:
        """T-Thumb-1: CreateProductRequest must declare `thumbnail_image_key`."""
        request = CreateProductRequest(
            title="2017 Toyota Camry",
            price_cents=1_850_000,
            category_id=uuid4(),
            attributes={},
            thumbnail_image_key=THUMB_KEY,
        )
        assert request.thumbnail_image_key == THUMB_KEY

    def test_dto_default_thumbnail_image_key_is_none(self) -> None:
        """T-Thumb-2: Omitting it (no fresh upload yet) must default to None."""
        request = CreateProductRequest(
            title="2017 Toyota Camry",
            price_cents=1_850_000,
            category_id=uuid4(),
            attributes={},
        )
        assert request.thumbnail_image_key is None

    @pytest.mark.asyncio
    async def test_execute_forwards_thumbnail_image_key_to_entity(self) -> None:
        """T-Thumb-3: The use case must pass `thumbnail_image_key` into
        `Product.create(...)` — not just accept it in the DTO. Captures
        the actual entity `product_repository.create` was called with.
        """
        tenant_id = uuid4()
        category = Category(
            id=uuid4(),
            name="Test Category",
            slug="test-category",
            tenant_id=tenant_id,
            attribute_schema={},
            is_active=True,
        )
        product_repo = AsyncMock()
        product_repo.create = AsyncMock(side_effect=lambda product: product)
        category_repo = AsyncMock()
        category_repo.get_by_id_or_global = AsyncMock(return_value=category)

        request = CreateProductRequest(
            title="2017 Toyota Camry",
            price_cents=1_850_000,
            tenant_id=tenant_id,
            organization_id=tenant_id,
            category_id=category.id,
            condition=ProductCondition.USED,
            attributes={},
            thumbnail_image_key=THUMB_KEY,
        )
        use_case = CreateProductUseCase(product_repo, category_repo)
        result = await use_case.execute(request)

        assert result.thumbnail_image_key == THUMB_KEY
        created_product: Product = product_repo.create.call_args.args[0]
        assert created_product.thumbnail_image_key == THUMB_KEY


class TestUpdateProductPersistsThumbnailImageKey:
    def test_dto_accepts_thumbnail_image_key(self) -> None:
        """T-Thumb-4: UpdateProductRequest must declare `thumbnail_image_key`
        with PATCH semantics (None = 'do not change')."""
        request = UpdateProductRequest(thumbnail_image_key=THUMB_KEY)
        assert request.thumbnail_image_key == THUMB_KEY

    def test_dto_default_thumbnail_image_key_is_none(self) -> None:
        """T-Thumb-5: Omitting it must default to None (existing suite pattern)."""
        request = UpdateProductRequest()
        assert request.thumbnail_image_key is None

    @pytest.mark.asyncio
    async def test_execute_forwards_thumbnail_image_key_to_entity(self) -> None:
        """T-Thumb-6: A PATCH that sets `thumbnail_image_key` must persist it
        on the entity — this is the exact gap found during smoke testing:
        the field was accepted by nothing, so it silently stayed None
        forever regardless of what the frontend sent.
        """
        tenant_id = uuid4()
        category = Category(
            id=uuid4(),
            name="Test Category",
            slug="test-category",
            tenant_id=tenant_id,
            attribute_schema={},
            is_active=True,
        )
        product = Product.create(
            title="2017 Toyota Camry",
            price_cents=1_850_000,
            tenant_id=tenant_id,
            organization_id=tenant_id,
            category_id=category.id,
            condition=ProductCondition.USED,
            attributes={},
            image_urls=[],
        )
        product_repo = AsyncMock()
        product_repo.get_by_id = AsyncMock(return_value=product)
        product_repo.update = AsyncMock(side_effect=lambda p: p)
        category_repo = AsyncMock()
        category_repo.get_by_id_or_global = AsyncMock(return_value=category)

        use_case = UpdateProductUseCase(product_repo, category_repo)
        result = await use_case.execute(
            product.id,
            tenant_id,
            UpdateProductRequest(thumbnail_image_key=THUMB_KEY),
        )

        assert result.thumbnail_image_key == THUMB_KEY

    @pytest.mark.asyncio
    async def test_execute_omitting_thumbnail_image_key_preserves_existing(self) -> None:
        """T-Thumb-7: A PATCH that does NOT mention `thumbnail_image_key`
        (e.g. the seller only changed the price, or kept the same cover
        without a fresh upload) must leave the existing value untouched —
        PATCH semantics, same contract as `cover_image_key`.
        """
        tenant_id = uuid4()
        category = Category(
            id=uuid4(),
            name="Test Category",
            slug="test-category",
            tenant_id=tenant_id,
            attribute_schema={},
            is_active=True,
        )
        product = Product.create(
            title="2017 Toyota Camry",
            price_cents=1_850_000,
            tenant_id=tenant_id,
            organization_id=tenant_id,
            category_id=category.id,
            condition=ProductCondition.USED,
            attributes={},
            image_urls=[],
            thumbnail_image_key=THUMB_KEY,
        )
        product_repo = AsyncMock()
        product_repo.get_by_id = AsyncMock(return_value=product)
        product_repo.update = AsyncMock(side_effect=lambda p: p)
        category_repo = AsyncMock()
        category_repo.get_by_id_or_global = AsyncMock(return_value=category)

        use_case = UpdateProductUseCase(product_repo, category_repo)
        result = await use_case.execute(
            product.id,
            tenant_id,
            UpdateProductRequest(price_cents=2_000_000),
        )

        assert result.thumbnail_image_key == THUMB_KEY
        assert result.price_cents == 2_000_000
