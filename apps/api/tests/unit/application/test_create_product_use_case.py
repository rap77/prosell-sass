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
    return Category(
        id=uuid4(),
        name="Test Category",
        slug="test-category",
        tenant_id=uuid4(),
        attribute_schema={},
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
    """When the request omits `vehicle_code`, the use case asks the
    `VehicleCodeAllocator` for the next MAX + 1 (or 1 if no row has one)
    and persists that on the new entity."""
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
    assert created_entity.vehicle_code == 42


@pytest.mark.asyncio
async def test_create_product_allocates_when_first_ever_product() -> None:
    """First product on a fresh DB: `VehicleCodeAllocator.allocate_next()`
    returns 1 (the seed case `COALESCE(max, 0) + 1`), and the new product
    carries `vehicle_code=1`."""
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
    assert created_entity.vehicle_code == 1


@pytest.mark.asyncio
async def test_create_product_rejects_explicit_duplicate_vehicle_code() -> None:
    """Caller supplied an explicit `vehicle_code` already used by another
    product — the use case must raise `DuplicateVehicleCodeError` BEFORE
    the INSERT runs, surfacing the same `code` that the allocator's
    `reserve()` rejected."""
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
        vehicle_code=17,  # another product already has it
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
    """Caller supplied an explicit, valid `vehicle_code` — the use case
    validates it via `reserve()` (which passes), then persists the
    entity with that exact value (the allocator is not consulted)."""
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
        vehicle_code=1234,
    )

    await use_case.execute(request)

    allocator.reserve.assert_awaited_once_with(1234)
    allocator.allocate_next.assert_not_awaited()
    created_entity = product_repo.create.await_args.args[0]
    assert created_entity.vehicle_code == 1234


@pytest.mark.asyncio
async def test_create_product_without_allocator_persists_no_vehicle_code() -> None:
    """Backwards-compatible behavior for tests/builds that predate the
    feature: when the use case is constructed without a
    `VehicleCodeAllocator` AND the caller didn't supply a `vehicle_code`,
    the entity persists with `vehicle_code=None` (the nullable column
    accepts it cleanly — same as the pre-feature shape)."""
    category = _category()
    tenant_id = uuid4()
    product_repo, category_repo = _product_repo_returning(category)
    # NB: no allocator passed in.
    use_case = CreateProductUseCase(product_repo, category_repo)

    request = CreateProductRequest(
        title="Legacy Test Shape",
        price_cents=10000,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category.id,
    )

    await use_case.execute(request)
    created_entity = product_repo.create.await_args.args[0]
    assert created_entity.vehicle_code is None


@pytest.mark.asyncio
async def test_create_product_response_includes_vehicle_code() -> None:
    """The DTO response carries the persisted `vehicle_code` so the
    frontend form reflects the actual stored value (relevant when the
    allocator picked it implicitly)."""
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
    assert response.vehicle_code == 7777
