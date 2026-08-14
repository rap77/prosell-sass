"""Integration tests for batch resume products use case."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.batch_resume_products import (
    BatchResumeProductsUseCase,
)
from prosell.domain.entities.product import Product, ProductStatus
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.mark.asyncio
async def test_batch_resume_mixed_reserved_and_paused(db_session, test_organization):
    """Mixed reserved/paused products should resume to published (spec scenario)."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 2 reserved + 3 paused products (spec scenario)
    reserved_products = []
    for i in range(2):
        product = Product(
            id=uuid4(),
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=uuid4(),
            title=f"Reserved {i}",
            price_cents=1000000,
            currency="USD",
            status=ProductStatus.RESERVED,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        reserved_products.append(saved)

    paused_products = []
    for i in range(3):
        product = Product(
            id=uuid4(),
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=uuid4(),
            title=f"Paused {i}",
            price_cents=1000000,
            currency="USD",
            status=ProductStatus.PAUSED,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        paused_products.append(saved)

    # Execute batch resume
    use_case = BatchResumeProductsUseCase(repo)
    all_ids = [p.id for p in reserved_products] + [p.id for p in paused_products]
    result = await use_case.execute(
        product_ids=all_ids,
        tenant_id=tenant_id,
    )

    # Assert counts (spec: resumed_count=5, failed_count=0)
    assert result.success_count == 5
    assert result.failed_count == 0
    assert len(result.results) == 5

    # Verify all results are resumed
    for item in result.results:
        assert item.status == "resumed"
        assert item.error_code is None

    # Verify all products are published in DB
    for product in reserved_products + paused_products:
        updated = await repo.get_by_id(product.id, tenant_id)
        assert updated is not None
        assert updated.status == ProductStatus.PUBLISHED


@pytest.mark.asyncio
async def test_batch_resume_invalid_transition_draft(db_session, test_organization):
    """Draft product should fail with invalid_transition (spec scenario)."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 1 draft product
    product = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=uuid4(),
        title="Draft Product",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.DRAFT,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await repo.create(product)

    # Try to resume draft product
    use_case = BatchResumeProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[product.id],
        tenant_id=tenant_id,
    )

    # Assert failure (spec: resumed_count=0, failed_count=1, error_code=invalid_transition)
    assert result.success_count == 0
    assert result.failed_count == 1
    assert len(result.results) == 1

    # Verify error details
    failed_result = result.results[0]
    assert failed_result.product_id == product.id
    assert failed_result.status == "failed"
    assert failed_result.error_code == "invalid_transition"

    # Verify product remains draft
    updated = await repo.get_by_id(product.id, tenant_id)
    assert updated is not None
    assert updated.status == ProductStatus.DRAFT
