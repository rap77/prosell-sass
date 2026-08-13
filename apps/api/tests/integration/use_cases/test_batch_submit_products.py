"""Integration tests for batch submit products use case."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.batch_submit_products import (
    BatchSubmitProductsUseCase,
)
from prosell.domain.entities.product import Product, ProductStatus
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.mark.asyncio
async def test_batch_submit_multiple_draft_products(db_session, test_organization):
    """All draft products should be submitted successfully."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    user_id = uuid4()

    # Create 3 draft products
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
            status=ProductStatus.DRAFT,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        products.append(saved)

    # Execute batch submit
    use_case = BatchSubmitProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[p.id for p in products],
        tenant_id=tenant_id,
        user_id=user_id,
    )

    # Assert counts
    assert result.submitted_count == 3
    assert result.failed_count == 0
    assert len(result.results) == 3

    # Verify all results are submitted
    for item in result.results:
        assert item.status == "submitted"
        assert item.error_code is None

    # Verify products are actually pending in DB
    for product in products:
        updated = await repo.get_by_id(product.id, tenant_id)
        assert updated is not None
        assert updated.status == ProductStatus.PENDING


@pytest.mark.asyncio
async def test_batch_submit_rejected_products(db_session, test_organization):
    """Rejected products should be submitted successfully."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    user_id = uuid4()
    reviewer_id = uuid4()

    # Create 2 rejected products
    products = []
    for i in range(2):
        product = Product(
            id=uuid4(),
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=uuid4(),
            title=f"Rejected Vehicle {i}",
            price_cents=1000000,
            currency="USD",
            status=ProductStatus.PENDING,  # Start as pending
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        # Reject it
        saved.reject(reviewer_id, "Quality issues")
        await repo.update(saved)
        products.append(saved)

    # Execute batch submit
    use_case = BatchSubmitProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[p.id for p in products],
        tenant_id=tenant_id,
        user_id=user_id,
    )

    # Assert counts
    assert result.submitted_count == 2
    assert result.failed_count == 0
    assert len(result.results) == 2

    # Verify products are pending again
    for product in products:
        updated = await repo.get_by_id(product.id, tenant_id)
        assert updated is not None
        assert updated.status == ProductStatus.PENDING


@pytest.mark.asyncio
async def test_batch_submit_partial_success(db_session, test_organization):
    """Mix of draft/published should return partial success."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    user_id = uuid4()

    # Create 2 draft + 1 published
    draft1 = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=uuid4(),
        title="Draft 1",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.DRAFT,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    draft2 = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=uuid4(),
        title="Draft 2",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.DRAFT,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    published = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=uuid4(),
        title="Published",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.PUBLISHED,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    await repo.create(draft1)
    await repo.create(draft2)
    await repo.create(published)

    # Execute batch submit
    use_case = BatchSubmitProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[draft1.id, draft2.id, published.id],
        tenant_id=tenant_id,
        user_id=user_id,
    )

    # Assert counts (2 success, 1 failure)
    assert result.submitted_count == 2
    assert result.failed_count == 1
    assert len(result.results) == 3

    # Verify draft products submitted
    draft1_updated = await repo.get_by_id(draft1.id, tenant_id)
    draft2_updated = await repo.get_by_id(draft2.id, tenant_id)
    assert draft1_updated is not None
    assert draft1_updated.status == ProductStatus.PENDING
    assert draft2_updated is not None
    assert draft2_updated.status == ProductStatus.PENDING

    # Verify published product unchanged
    published_updated = await repo.get_by_id(published.id, tenant_id)
    assert published_updated is not None
    assert published_updated.status == ProductStatus.PUBLISHED

    # Verify failed result
    failed_result = next(r for r in result.results if r.status == "failed")
    assert failed_result.product_id == published.id
    assert failed_result.error_code == "invalid_transition"


@pytest.mark.asyncio
async def test_batch_submit_deduplicates_ids(db_session, test_organization):
    """Duplicate IDs should be processed only once."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    user_id = uuid4()

    # Create 1 draft product
    product = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=uuid4(),
        title="Test Vehicle",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.DRAFT,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await repo.create(product)

    # Submit with duplicate IDs
    use_case = BatchSubmitProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[product.id, product.id, product.id],  # 3 duplicates
        tenant_id=tenant_id,
        user_id=user_id,
    )

    # Assert only processed once
    assert result.submitted_count == 1
    assert result.failed_count == 0
    assert len(result.results) == 1


@pytest.mark.asyncio
async def test_batch_submit_nonexistent_product(db_session, test_organization):
    """Nonexistent product should return error."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    user_id = uuid4()

    # Try to submit nonexistent product
    fake_id = uuid4()
    use_case = BatchSubmitProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[fake_id],
        tenant_id=tenant_id,
        user_id=user_id,
    )

    # Assert failure
    assert result.submitted_count == 0
    assert result.failed_count == 1
    assert len(result.results) == 1

    # Verify error details
    failed_result = result.results[0]
    assert failed_result.product_id == fake_id
    assert failed_result.status == "failed"
    assert failed_result.error_code == "not_found"
    assert failed_result.message is not None
    assert "not found" in failed_result.message.lower()
