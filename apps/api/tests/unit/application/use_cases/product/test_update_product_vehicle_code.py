"""Test UpdateProductUseCase.

Covers the `vehicle_code` PATCH branch (allow-change + uniqueness
excluding self). The broader update surface (cover/thumbnail/images/
title recomposition, broker shares, etc.) has its own dedicated test
files; this one focuses on the new feature.
"""

from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from prosell.application.dto.product import UpdateProductRequest
from prosell.application.use_cases.product.update_product import UpdateProductUseCase
from prosell.domain.entities.category import Category
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.product_exceptions import DuplicateVehicleCodeError
from prosell.domain.value_objects.product_status import ProductStatus


def _category() -> Category:
    return Category(
        id=uuid4(),
        name="Test Category",
        slug="test-category",
        tenant_id=uuid4(),
        attribute_schema={},
        is_active=True,
    )


def _existing_product(
    tenant_id: UUID,
    category_id: UUID,
    *,
    vehicle_code: int | None = 5,
) -> Product:
    return Product(
        id=uuid4(),
        title="Existing",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category_id,
        status=ProductStatus.DRAFT,
        vehicle_code=vehicle_code,
    )


def _build_repos(
    existing: Product,
    category: Category,
) -> tuple[AsyncMock, AsyncMock, AsyncMock]:
    product_repo = AsyncMock()
    product_repo.get_by_id = AsyncMock(return_value=existing)
    product_repo.vehicle_code_exists = AsyncMock(return_value=False)
    # update() captures the entity passed in
    captured: dict[str, Product] = {}

    async def _capture(entity: Product, **_kwargs: object) -> Product:
        captured["entity"] = entity
        return entity

    product_repo.update = AsyncMock(side_effect=_capture)
    product_repo._captured = captured  # type: ignore[attr-defined]

    category_repo = AsyncMock()
    category_repo.get_by_id_or_global = AsyncMock(return_value=category)

    ownership_repo = AsyncMock()

    return product_repo, category_repo, ownership_repo


@pytest.mark.asyncio
async def test_update_product_allows_changing_vehicle_code() -> None:
    """PATCH sets `vehicle_code` to a new valid value — the entity carries
    the new code into `repo.update()`."""
    tenant_id = uuid4()
    category_id = uuid4()
    category = _category()
    category.tenant_id = tenant_id
    category.id = category_id
    existing = _existing_product(tenant_id, category_id, vehicle_code=5)
    product_repo, category_repo, ownership_repo = _build_repos(existing, category)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    request = UpdateProductRequest(vehicle_code=42)
    await use_case.execute(existing.id, tenant_id, request)

    # Uniqueness check ran with `exclude_product_id=existing.id` (the row
    # being updated, so its current value of 5 isn't a false-positive).
    product_repo.vehicle_code_exists.assert_awaited_once_with(42, exclude_product_id=existing.id)
    updated_entity: Product = product_repo._captured["entity"]  # type: ignore[attr-defined]
    assert updated_entity.vehicle_code == 42


@pytest.mark.asyncio
async def test_update_product_rejects_duplicate_vehicle_code() -> None:
    """Another product already holds the requested `vehicle_code` —
    PATCH must surface `DuplicateVehicleCodeError` and NOT call
    `repo.update()`."""
    tenant_id = uuid4()
    category_id = uuid4()
    category = _category()
    category.tenant_id = tenant_id
    category.id = category_id
    existing = _existing_product(tenant_id, category_id, vehicle_code=5)
    product_repo, category_repo, ownership_repo = _build_repos(existing, category)
    product_repo.vehicle_code_exists = AsyncMock(return_value=True)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    request = UpdateProductRequest(vehicle_code=99)
    with pytest.raises(DuplicateVehicleCodeError) as exc_info:
        await use_case.execute(existing.id, tenant_id, request)
    assert exc_info.value.vehicle_code == 99
    product_repo.update.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_product_no_op_when_vehicle_code_unchanged() -> None:
    """PATCH sends `vehicle_code=5` and the product already has `5` — the
    uniqueness check is SKIPPED (no point verifying a value the row
    already holds) and the update proceeds normally."""
    tenant_id = uuid4()
    category_id = uuid4()
    category = _category()
    category.tenant_id = tenant_id
    category.id = category_id
    existing = _existing_product(tenant_id, category_id, vehicle_code=5)
    product_repo, category_repo, ownership_repo = _build_repos(existing, category)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    request = UpdateProductRequest(vehicle_code=5)
    await use_case.execute(existing.id, tenant_id, request)

    product_repo.vehicle_code_exists.assert_not_awaited()
    product_repo.update.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_product_none_vehicle_code_is_unchanged() -> None:
    """PATCH omits `vehicle_code` (None) — the entity's current value
    is preserved (PATCH semantics, no destructive clear)."""
    tenant_id = uuid4()
    category_id = uuid4()
    category = _category()
    category.tenant_id = tenant_id
    category.id = category_id
    existing = _existing_product(tenant_id, category_id, vehicle_code=5)
    product_repo, category_repo, ownership_repo = _build_repos(existing, category)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    request = UpdateProductRequest()  # no vehicle_code
    await use_case.execute(existing.id, tenant_id, request)

    updated_entity: Product = product_repo._captured["entity"]  # type: ignore[attr-defined]
    assert updated_entity.vehicle_code == 5  # unchanged
    product_repo.vehicle_code_exists.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_product_response_carries_vehicle_code() -> None:
    """`ProductResponse.from_entity` includes `vehicle_code` so the
    frontend PATCH response reflects the actual stored value."""
    tenant_id = uuid4()
    category_id = uuid4()
    category = _category()
    category.tenant_id = tenant_id
    category.id = category_id
    existing = _existing_product(tenant_id, category_id, vehicle_code=5)
    product_repo, category_repo, ownership_repo = _build_repos(existing, category)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    request = UpdateProductRequest(vehicle_code=42)
    response = await use_case.execute(existing.id, tenant_id, request)
    assert response.vehicle_code == 42
