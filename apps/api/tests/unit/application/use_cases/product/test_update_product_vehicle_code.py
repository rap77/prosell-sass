"""Test UpdateProductUseCase.

Covers the `vehicle_code` PATCH branch via the `attributes` JSONB
path (post-`20260927_0001_move_vehicle_code_to_attributes_jsonb.py`).
The broader update surface (cover/thumbnail/images/title recomposition,
broker shares, etc.) has its own dedicated test files; this one focuses
on the JSONB-side flow: allow-change, uniqueness excluding self, and
PATCH semantics where absent means "leave the JSONB value untouched".
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
    vehicle_code: str | None = "5",
) -> Product:
    # vehicle_code lives in `attributes` as text since the JSONB move.
    attrs: dict[str, object] = {}
    if vehicle_code is not None:
        attrs["vehicle_code"] = vehicle_code
    return Product(
        id=uuid4(),
        title="Existing",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category_id,
        status=ProductStatus.DRAFT,
        attributes=attrs,
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
    """PATCH sets `attributes["vehicle_code"]` to a new value — the
    uniqueness check (excluding self) runs, and the entity carries the
    new code into `repo.update()`.
    """
    tenant_id = uuid4()
    category_id = uuid4()
    category = _category()
    category.tenant_id = tenant_id
    category.id = category_id
    existing = _existing_product(tenant_id, category_id, vehicle_code="5")
    product_repo, category_repo, ownership_repo = _build_repos(existing, category)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    request = UpdateProductRequest(attributes={"vehicle_code": 42})
    await use_case.execute(existing.id, tenant_id, request)

    # Uniqueness check ran with `exclude_product_id=existing.id` (the row
    # being updated, so its current value of "5" isn't a false-positive).
    product_repo.vehicle_code_exists.assert_awaited_once_with(42, exclude_product_id=existing.id)
    updated_entity: Product = product_repo._captured["entity"]  # type: ignore[attr-defined]
    # Stored as JSONB native int (post-`20260927_0001`) so the
    # category's `attribute_schema` validator accepts the value as
    # `isinstance(value, (int, float))`. The functional unique index
    # still extracts the text form for uniqueness comparison.
    assert updated_entity.attributes["vehicle_code"] == 42


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
    existing = _existing_product(tenant_id, category_id, vehicle_code="5")
    product_repo, category_repo, ownership_repo = _build_repos(existing, category)
    product_repo.vehicle_code_exists = AsyncMock(return_value=True)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    request = UpdateProductRequest(attributes={"vehicle_code": 99})
    with pytest.raises(DuplicateVehicleCodeError) as exc_info:
        await use_case.execute(existing.id, tenant_id, request)
    assert exc_info.value.vehicle_code == 99
    product_repo.update.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_product_no_op_when_vehicle_code_unchanged() -> None:
    """PATCH sets `attributes["vehicle_code"]` to the same value the
    product already holds — the uniqueness check is SKIPPED (no point
    verifying a value the row already holds) and the update proceeds
    normally.
    """
    tenant_id = uuid4()
    category_id = uuid4()
    category = _category()
    category.tenant_id = tenant_id
    category.id = category_id
    existing = _existing_product(tenant_id, category_id, vehicle_code="5")
    product_repo, category_repo, ownership_repo = _build_repos(existing, category)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    request = UpdateProductRequest(attributes={"vehicle_code": 5})
    await use_case.execute(existing.id, tenant_id, request)

    product_repo.vehicle_code_exists.assert_not_awaited()
    product_repo.update.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_product_no_attributes_means_unchanged() -> None:
    """PATCH omits `attributes` (None) — the entity's current
    `attributes` dict is preserved (PATCH semantics, no destructive
    clear)."""
    tenant_id = uuid4()
    category_id = uuid4()
    category = _category()
    category.tenant_id = tenant_id
    category.id = category_id
    existing = _existing_product(tenant_id, category_id, vehicle_code="5")
    product_repo, category_repo, ownership_repo = _build_repos(existing, category)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    request = UpdateProductRequest()  # no attributes
    await use_case.execute(existing.id, tenant_id, request)

    updated_entity: Product = product_repo._captured["entity"]  # type: ignore[attr-defined]
    assert updated_entity.attributes["vehicle_code"] == "5"  # unchanged
    product_repo.vehicle_code_exists.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_product_response_carries_vehicle_code_in_attributes() -> None:
    """`ProductResponse.from_entity` carries `vehicle_code` inside
    `attributes` so the frontend PATCH response reflects the actual
    stored value.
    """
    tenant_id = uuid4()
    category_id = uuid4()
    category = _category()
    category.tenant_id = tenant_id
    category.id = category_id
    existing = _existing_product(tenant_id, category_id, vehicle_code="5")
    product_repo, category_repo, ownership_repo = _build_repos(existing, category)
    use_case = UpdateProductUseCase(product_repo, category_repo, ownership_repo)

    request = UpdateProductRequest(attributes={"vehicle_code": 42})
    response = await use_case.execute(existing.id, tenant_id, request)
    assert response.attributes["vehicle_code"] == 42
