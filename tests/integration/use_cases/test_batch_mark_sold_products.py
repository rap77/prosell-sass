"""Integration tests for batch mark sold products use case."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.batch_mark_sold_products import (
    BatchMarkSoldProductsUseCase,
)
from prosell.domain.entities.product import Product, ProductStatus
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.mark.asyncio
async def test_batch_mark_sold_multiple_published_products(db_session, test_organization):
    """All published products should be marked sold (spec scenario)."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 3 published products (spec: 3 published)
    products = []
    for i in range(3):
        product = Product(
            id=uuid4(),
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=uuid4(),
            title=f"Test Vehicle {i}",
            price_cents=1000000,
            currency="USD",
            status=ProductStatus.PUBLISHED,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        products.append(saved)

    # Execute batch mark sold
    use_case = BatchMarkSoldProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[p.id for p in products],
        tenant_id=tenant_id,
    )

    # Assert counts (spec: sold_count=3, failed_count=0)
    assert result.success_count == 3
    assert result.failed_count == 0
    assert len(result.results) == 3

    # Verify all results are sold
    for item in result.results:
        assert item.status == "sold"
        assert item.error_code is None

    # Verify products are actually sold in DB
    for product in products:
        updated = await repo.get_by_id(product.id, tenant_id)
        assert updated is not None
        assert updated.status == ProductStatus.SOLD


@pytest.mark.asyncio
async def test_batch_mark_sold_reserved_product(db_session, test_organization):
    """Reserved product should be marked sold (spec scenario)."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 1 reserved product
    product = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=uuid4(),
        title="Reserved Product",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.RESERVED,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await repo.create(product)

    # Execute batch mark sold
    use_case = BatchMarkSoldProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[product.id],
        tenant_id=tenant_id,
    )

    # Assert success (spec: sold_count=1, failed_count=0)
    assert result.success_count == 1
    assert result.failed_count == 0
    assert len(result.results) == 1

    # Verify result is sold
    assert result.results[0].status == "sold"
    assert result.results[0].error_code is None

    # Verify product is sold in DB
    updated = await repo.get_by_id(product.id, tenant_id)
    assert updated is not None
    assert updated.status == ProductStatus.SOLD
