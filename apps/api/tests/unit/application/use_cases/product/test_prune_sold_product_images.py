"""Unit tests for PruneSoldProductImagesUseCase.

Pure unit test: the repository and storage ports are mocked, so no DB and no
network are touched. Covers the prune invariants from the storage spec §4.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.prune_sold_product_images import (
    PruneSoldProductImagesUseCase,
)
from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_status import ProductStatus


def _sold_product(keys: list[str], cover: str | None) -> Product:
    product = Product.create(
        tenant_id=uuid4(),
        organization_id=uuid4(),
        title="P",
        slug=f"p-{uuid4().hex[:8]}",
        description="d",
        price_cents=1000,
        currency="USD",
        category_id=uuid4(),
    )
    product.status = ProductStatus.SOLD
    product.sold_at = datetime.now(UTC) - timedelta(days=40)
    product.image_urls = list(keys)
    product.cover_image_key = cover
    return product


@pytest.mark.asyncio
async def test_prune_deletes_non_cover_and_keeps_cover() -> None:
    product = _sold_product(["a.webp", "cover.webp", "b.webp"], "cover.webp")
    repo = AsyncMock()
    repo.get_sold_before.return_value = [product]
    storage = AsyncMock()
    storage.delete_file.return_value = True

    use_case = PruneSoldProductImagesUseCase(repo, storage, grace_days=30)
    summary = await use_case.execute()

    deleted = {call.args[0] for call in storage.delete_file.call_args_list}
    assert deleted == {"a.webp", "b.webp"}
    assert product.image_urls == ["cover.webp"]
    assert product.cover_image_key == "cover.webp"
    repo.update.assert_awaited_once_with(product)
    assert summary["products_pruned"] == 1
    assert summary["images_deleted"] == 2


@pytest.mark.asyncio
async def test_prune_is_noop_when_only_cover_remains() -> None:
    product = _sold_product(["cover.webp"], "cover.webp")
    repo = AsyncMock()
    repo.get_sold_before.return_value = [product]
    storage = AsyncMock()

    use_case = PruneSoldProductImagesUseCase(repo, storage, grace_days=30)
    summary = await use_case.execute()

    storage.delete_file.assert_not_awaited()
    repo.update.assert_not_awaited()
    assert summary["products_pruned"] == 0
    assert summary["images_deleted"] == 0


@pytest.mark.asyncio
async def test_prune_skips_product_without_cover() -> None:
    # No cover -> do NOT delete everything (we'd lose the reference image).
    product = _sold_product(["a.webp", "b.webp"], None)
    repo = AsyncMock()
    repo.get_sold_before.return_value = [product]
    storage = AsyncMock()

    use_case = PruneSoldProductImagesUseCase(repo, storage, grace_days=30)
    summary = await use_case.execute()

    storage.delete_file.assert_not_awaited()
    repo.update.assert_not_awaited()
    assert summary["products_pruned"] == 0
