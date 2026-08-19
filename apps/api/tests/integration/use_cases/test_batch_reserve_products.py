"""Integration tests for batch reserve products use case."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.batch_reserve_products import (
    BatchReserveProductsUseCase,
)
from prosell.domain.entities.product import Product, ProductStatus
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.mark.asyncio
async def test_batch_reserve_multiple_published_products(
    db_session, test_organization, test_user, test_category
):
    """All published products should be reserved successfully."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 5 published products
    products = []
    for i in range(5):
        product = Product(
            id=uuid4(),
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            title=f"Test Vehicle {i}",
            price_cents=1000000,
            currency="USD",
            status=ProductStatus.PUBLISHED,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        products.append(saved)

    # Execute batch reserve
    use_case = BatchReserveProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[p.id for p in products],
        tenant_id=tenant_id,
        user_id=test_user.id,
    )

    # Assert counts (spec: reserved_count=5, failed_count=0)
    assert result.success_count == 5
    assert result.failed_count == 0
    assert len(result.results) == 5

    # Verify all results are reserved
    for item in result.results:
        assert item.status == "reserved"
        assert item.error_code is None

    # Verify products are actually reserved in DB
    for product in products:
        updated = await repo.get_by_id(product.id, tenant_id)
        assert updated is not None
        assert updated.status == ProductStatus.RESERVED


@pytest.mark.asyncio
async def test_batch_reserve_partial_success_mixed_statuses(
    db_session, test_organization, test_user, test_category
):
    """Mix of published/draft should return partial success."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 3 published + 2 draft (spec scenario)
    published_products = []
    for i in range(3):
        product = Product(
            id=uuid4(),
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            title=f"Published {i}",
            price_cents=1000000,
            currency="USD",
            status=ProductStatus.PUBLISHED,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        published_products.append(saved)

    draft_products = []
    for i in range(2):
        product = Product(
            id=uuid4(),
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            title=f"Draft {i}",
            price_cents=1000000,
            currency="USD",
            status=ProductStatus.DRAFT,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        draft_products.append(saved)

    # Execute batch reserve with mixed IDs
    use_case = BatchReserveProductsUseCase(repo)
    all_ids = [p.id for p in published_products] + [p.id for p in draft_products]
    result = await use_case.execute(
        product_ids=all_ids,
        tenant_id=tenant_id,
        user_id=test_user.id,
    )

    # Assert counts (spec: reserved_count=3, failed_count=2)
    assert result.success_count == 3
    assert result.failed_count == 2
    assert len(result.results) == 5

    # Verify published products reserved
    for product in published_products:
        updated = await repo.get_by_id(product.id, tenant_id)
        assert updated is not None
        assert updated.status == ProductStatus.RESERVED

    # Verify draft products unchanged
    for product in draft_products:
        updated = await repo.get_by_id(product.id, tenant_id)
        assert updated is not None
        assert updated.status == ProductStatus.DRAFT

    # Verify failed results have error_code=invalid_transition
    failed_results = [r for r in result.results if r.status == "failed"]
    assert len(failed_results) == 2
    for failed in failed_results:
        assert failed.error_code == "invalid_transition"


@pytest.mark.asyncio
async def test_batch_reserve_product_not_found(db_session, test_organization, test_user):
    """Nonexistent product should return error_code=not_found."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Try to reserve nonexistent product (spec scenario)
    fake_id = uuid4()
    use_case = BatchReserveProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[fake_id],
        tenant_id=tenant_id,
        user_id=test_user.id,
    )

    # Assert failure
    assert result.success_count == 0
    assert result.failed_count == 1
    assert len(result.results) == 1

    # Verify error details (spec: error_code=not_found)
    failed_result = result.results[0]
    assert failed_result.product_id == fake_id
    assert failed_result.status == "failed"
    assert failed_result.error_code == "not_found"
    assert failed_result.message is not None


@pytest.mark.asyncio
async def test_batch_reserve_deduplicates_ids(
    db_session, test_organization, test_user, test_category
):
    """Duplicate IDs should be processed only once (spec requirement)."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id

    # Create 1 published product
    product = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Test Vehicle",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.PUBLISHED,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await repo.create(product)

    # Reserve with duplicate IDs (spec: [A, B, A, C] → only 3 unique)
    use_case = BatchReserveProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[product.id, product.id, product.id],  # 3 duplicates
        tenant_id=tenant_id,
        user_id=test_user.id,
    )

    # Assert only processed once
    assert result.success_count == 1
    assert result.failed_count == 0
    assert len(result.results) == 1
