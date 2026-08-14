"""Integration tests for batch pause products use case."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.batch_pause_products import (
    BatchPauseProductsUseCase,
)
from prosell.domain.entities.product import Product, ProductStatus
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.mark.asyncio
async def test_batch_pause_multiple_published_products(db_session, test_organization):
    """All published products should be paused successfully (spec scenario)."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 4 published products (spec: 4 published)
    products = []
    for i in range(4):
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

    # Execute batch pause
    use_case = BatchPauseProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[p.id for p in products],
        tenant_id=tenant_id,
    )

    # Assert counts (spec: paused_count=4, failed_count=0)
    assert result.success_count == 4
    assert result.failed_count == 0
    assert len(result.results) == 4

    # Verify all results are paused
    for item in result.results:
        assert item.status == "paused"
        assert item.error_code is None

    # Verify products are actually paused in DB
    for product in products:
        updated = await repo.get_by_id(product.id, tenant_id)
        assert updated is not None
        assert updated.status == ProductStatus.PAUSED
