"""Test CreateProductUseCase."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.product import CreateProductRequest
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.domain.entities.category import Category
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.category_exceptions import CategoryNotFoundError
from prosell.domain.exceptions.product_exceptions import DuplicateVehicleCodeError
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus


@pytest.mark.asyncio
async def test_create_product_success():
    """Test successful product creation."""
    tenant_id = uuid4()
    category = Category(
        id=uuid4(),
        name="Test Category",
        slug="test-category",
        tenant_id=tenant_id,
        attribute_schema={},
        is_active=True,
    )
    product_id = uuid4()
    mock_product = Product(
        id=product_id,
        title="Test Product",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
        status=ProductStatus.DRAFT,
    )

    product_repo = AsyncMock()
    product_repo.create = AsyncMock(return_value=mock_product)
    category_repo = AsyncMock()
    category_repo.get_by_id_or_global = AsyncMock(return_value=category)

    request = CreateProductRequest(
        title="Test Product",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
        condition=ProductCondition.NEW,
    )
    use_case = CreateProductUseCase(product_repo, category_repo)
    result = await use_case.execute(request)

    assert result.id is not None
    assert result.title == "Test Product"
    assert result.price_cents == 10000
    assert result.status == "draft"


@pytest.mark.asyncio
async def test_create_product_category_not_found():
    """Test product creation with non-existent category."""
    product_repo = AsyncMock()
    category_repo = AsyncMock()
    category_repo.get_by_id_or_global = AsyncMock(return_value=None)

    request = CreateProductRequest(
        title="Test Product",
        price_cents=10000,
        tenant_id=uuid4(),
        organization_id=uuid4(),
        category_id=uuid4(),
    )
    use_case = CreateProductUseCase(product_repo, category_repo)

    with pytest.raises(CategoryNotFoundError):
        await use_case.execute(request)


# ── vehicle_code allocator wiring ─────────────────────────────────────────


def _category() -> Category:
    # `vehicle_code` lives inside the vehicle category's
    # `attribute_schema` (post-`20260927_0001_*`); the use case's
    # allocator / collision check only fires when the category
    # declares the key. This fixture is a vehicle-category stand-in
    # so the vehicle_code tests exercise the real path.
    return Category(
        id=uuid4(),
        name="Test Category",
        slug="test-category",
        tenant_id=uuid4(),
        attribute_schema={"vehicle_code": {"type": "number", "required": True}},
        is_active=True,
    )


def _product_repo_returning(category: Category) -> tuple[AsyncMock, AsyncMock]:
    """Return a (product_repo, category_repo) pair where product_repo.create
    captures the entity passed in (so the test can assert what was
    persisted) and category_repo resolves the category."""
    category_repo = AsyncMock()
    category_repo.get_by_id_or_global = AsyncMock(return_value=category)

    product_repo = AsyncMock()

    async def _capture_create(entity: Product) -> Product:
        return entity

    product_repo.create = AsyncMock(side_effect=_capture_create)
    product_repo.get_max_vehicle_code = AsyncMock(return_value=None)
    product_repo.vehicle_code_exists = AsyncMock(return_value=False)
    return product_repo, category_repo


@pytest.mark.asyncio
async def test_create_product_allocates_vehicle_code_when_omitted() -> None:
    """When the request omits `attributes["vehicle_code"]`, the use case
    asks the `VehicleCodeAllocator` for the next MAX + 1 (or 1 if no row
    has one) and stuffs the result into `attributes["vehicle_code"]` as
    text. The use case still works against a regular repo + allocator
    pair — the new path only changes WHERE the value lands.
    """
    category = _category()
    tenant_id = uuid4()
    product_repo, category_repo = _product_repo_returning(category)
    allocator = AsyncMock()
    allocator.allocate_next = AsyncMock(return_value=42)
    use_case = CreateProductUseCase(product_repo, category_repo, allocator)

    request = CreateProductRequest(
        title="No Code Specified",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
    )

    await use_case.execute(request)

    allocator.allocate_next.assert_awaited_once()
    created_entity = product_repo.create.await_args.args[0]
    # Stored as JSONB native int (post-`20260927_0001`) so the
    # category's `attribute_schema` validator accepts the value as
    # `isinstance(value, (int, float))`. The partial functional
    # unique index on `attributes->>'vehicle_code'` extracts the int
    # as text for the uniqueness comparison.
    assert created_entity.attributes["vehicle_code"] == 42


@pytest.mark.asyncio
async def test_create_product_allocates_when_first_ever_product() -> None:
    """First product on a fresh DB: `VehicleCodeAllocator.allocate_next()`
    returns 1 (the seed case `COALESCE(max, 0) + 1`), and the new
    product's `attributes["vehicle_code"]` is the int `1`.
    """
    category = _category()
    tenant_id = uuid4()
    product_repo, category_repo = _product_repo_returning(category)
    allocator = AsyncMock()
    allocator.allocate_next = AsyncMock(return_value=1)
    use_case = CreateProductUseCase(product_repo, category_repo, allocator)

    request = CreateProductRequest(
        title="First Ever",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
    )

    await use_case.execute(request)

    created_entity = product_repo.create.await_args.args[0]
    assert created_entity.attributes["vehicle_code"] == 1


@pytest.mark.asyncio
async def test_create_product_rejects_explicit_duplicate_vehicle_code() -> None:
    """Caller supplied an explicit `attributes["vehicle_code"]` already
    used by another product — the use case must raise
    `DuplicateVehicleCodeError` BEFORE the INSERT runs, surfacing the
    same `code` that the allocator's `reserve()` rejected.
    """
    category = _category()
    tenant_id = uuid4()
    product_repo, category_repo = _product_repo_returning(category)
    allocator = AsyncMock()

    async def _reserve_rejects(code: int) -> None:
        raise DuplicateVehicleCodeError(code)

    allocator.allocate_next = AsyncMock(return_value=99)
    allocator.reserve = AsyncMock(side_effect=_reserve_rejects)
    use_case = CreateProductUseCase(product_repo, category_repo, allocator)

    request = CreateProductRequest(
        title="Explicit Duplicate",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
        attributes={"vehicle_code": 17},  # another product already has it
    )

    with pytest.raises(DuplicateVehicleCodeError) as exc_info:
        await use_case.execute(request)
    assert exc_info.value.vehicle_code == 17
    # Repo.create must NOT have been called when the allocator rejects.
    product_repo.create.assert_not_awaited()
    # Allocate_next must NOT have been called when an explicit code was
    # provided — the use case only allocates when the caller omitted the
    # code, never alongside an explicit one.
    allocator.allocate_next.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_product_persists_explicit_vehicle_code() -> None:
    """Caller supplied an explicit, valid
    `attributes["vehicle_code"]` — the use case validates it via
    `reserve()` (which passes), then persists the value as a JSONB
    native int (matching the category's `attribute_schema` validator,
    which accepts `isinstance(value, (int, float))`).
    """
    category = _category()
    tenant_id = uuid4()
    product_repo, category_repo = _product_repo_returning(category)
    allocator = AsyncMock()
    allocator.reserve = AsyncMock(return_value=None)  # not a duplicate
    allocator.allocate_next = AsyncMock(return_value=99)  # would be wrong
    use_case = CreateProductUseCase(product_repo, category_repo, allocator)

    request = CreateProductRequest(
        title="Explicit Valid Code",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
        attributes={"vehicle_code": 1234},
    )

    await use_case.execute(request)

    allocator.reserve.assert_awaited_once_with(1234)
    allocator.allocate_next.assert_not_awaited()
    created_entity = product_repo.create.await_args.args[0]
    # Stored as JSONB native int (post-`20260927_0001`) so the
    # `attribute_schema` validator passes.
    assert created_entity.attributes["vehicle_code"] == 1234


@pytest.mark.asyncio
async def test_create_product_non_vehicle_category_skips_vehicle_code() -> None:
    """Non-vehicle categories' `attribute_schema` doesn't declare a
    `vehicle_code` key, so the use case skips the allocation /
    reservation block entirely. The caller can still pass
    `attributes["vehicle_code"]` if they want, but the use case won't
    auto-populate it and won't validate it against the allocator.

    Mirrors the pre-feature behavior for non-vehicle categories: no
    allocator call, no reservation, no error."""
    # Non-vehicle category: `vehicle_code` is NOT in `attribute_schema`.
    category = Category(
        id=uuid4(),
        name="Real Estate",
        slug="real-estate",
        tenant_id=uuid4(),
        attribute_schema={"bedrooms": {"type": "number"}},
        is_active=True,
    )
    tenant_id = uuid4()
    product_repo, category_repo = _product_repo_returning(category)
    allocator = AsyncMock()
    use_case = CreateProductUseCase(product_repo, category_repo, allocator)

    request = CreateProductRequest(
        title="Non-vehicle product",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
    )

    await use_case.execute(request)
    # Allocator was never called — non-vehicle category bypasses
    # the entire vehicle_code block.
    allocator.allocate_next.assert_not_awaited()
    allocator.reserve.assert_not_awaited()
    created_entity = product_repo.create.await_args.args[0]
    assert "vehicle_code" not in (created_entity.attributes or {})


@pytest.mark.asyncio
async def test_create_product_response_carries_vehicle_code_in_attributes() -> None:
    """The DTO response carries the persisted vehicle_code inside
    `attributes` so the frontend form reflects the actual stored value
    (relevant when the allocator picked it implicitly)."""
    category = _category()
    tenant_id = uuid4()
    product_repo, category_repo = _product_repo_returning(category)
    allocator = AsyncMock()
    allocator.allocate_next = AsyncMock(return_value=7777)
    use_case = CreateProductUseCase(product_repo, category_repo, allocator)

    request = CreateProductRequest(
        title="Any",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
    )

    response = await use_case.execute(request)
    # Stored as JSONB native int (post-`20260927_0001`); the
    # category's `attribute_schema` validator accepts the value as
    # `isinstance(value, (int, float))`.
    assert response.attributes["vehicle_code"] == 7777
