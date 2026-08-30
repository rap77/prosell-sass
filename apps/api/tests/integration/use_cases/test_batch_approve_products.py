"""Integration tests for batch approve products use case."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.batch_approve_products import (
    BatchApproveProductsUseCase,
)
from prosell.domain.entities.product import Product, ProductStatus
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.mark.asyncio
async def test_batch_approve_multiple_pending_products(
    db_session, test_organization, test_category, test_user
):
    """All pending products should be approved successfully."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    reviewer_id = test_user.id

    # Create 3 pending products
    products = []
    for i in range(3):
        product = Product(
            id=uuid4(),
            tenant_id=tenant_id,
            organization_id=test_organization.id,
            category_id=test_category.id,
            title=f"Test Vehicle {i}",
            price_cents=1000000,
            currency="USD",
            status=ProductStatus.PENDING,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        saved = await repo.create(product)
        products.append(saved)

    # Execute batch approve
    use_case = BatchApproveProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[p.id for p in products],
        tenant_id=tenant_id,
        user_id=reviewer_id,
    )

    # Assert counts
    assert result.approved_count == 3
    assert result.failed_count == 0
    assert len(result.results) == 3

    # Verify all results are approved
    for item in result.results:
        assert item.status == "approved"
        assert item.error_code is None

    # Verify products are actually approved in DB
    for product in products:
        updated = await repo.get_by_id(product.id, tenant_id)
        assert updated is not None
        assert updated.status == ProductStatus.PUBLISHED
        assert updated.approved_by == reviewer_id
        assert updated.approved_at is not None


@pytest.mark.asyncio
async def test_batch_approve_partial_success(
    db_session, test_organization, test_category, test_user
):
    """Mix of pending/draft should return partial success."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    reviewer_id = test_user.id

    # Create 2 pending + 1 draft
    pending1 = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Pending 1",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.PENDING,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    pending2 = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Pending 2",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.PENDING,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    draft = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Draft",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.DRAFT,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    pending1 = await repo.create(pending1)
    pending2 = await repo.create(pending2)
    draft = await repo.create(draft)

    # Execute batch approve
    use_case = BatchApproveProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[pending1.id, pending2.id, draft.id],
        tenant_id=tenant_id,
        user_id=reviewer_id,
    )

    # Assert counts
    assert result.approved_count == 2
    assert result.failed_count == 1
    assert len(result.results) == 3

    # Verify draft failed with correct error
    draft_result = next(r for r in result.results if r.product_id == draft.id)
    assert draft_result.status == "failed"
    assert draft_result.error_code == "invalid_transition"
    assert draft_result.message is not None and "Cannot approve" in draft_result.message

    # Verify pending products succeeded
    for pid in [pending1.id, pending2.id]:
        result_item = next(r for r in result.results if r.product_id == pid)
        assert result_item.status == "approved"
        assert result_item.error_code is None


@pytest.mark.asyncio
async def test_batch_approve_deduplicates_ids(
    db_session, test_organization, test_category, test_user
):
    """Duplicate IDs should be deduplicated."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    reviewer_id = test_user.id

    # Create 1 pending product
    product = Product(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Test Vehicle",
        price_cents=1000000,
        currency="USD",
        status=ProductStatus.PENDING,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    product = await repo.create(product)

    # Execute batch approve with duplicate ID
    use_case = BatchApproveProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[product.id, product.id, product.id],  # 3 duplicates
        tenant_id=tenant_id,
        user_id=reviewer_id,
    )

    # Should only process once
    assert result.approved_count == 1
    assert result.failed_count == 0
    assert len(result.results) == 1


@pytest.mark.asyncio
async def test_batch_approve_nonexistent_product(db_session, test_organization):
    """Nonexistent product should fail with not_found error."""
    repo = SqlAlchemyProductRepository(db_session)
    tenant_id = test_organization.tenant_id
    reviewer_id = uuid4()
    fake_id = uuid4()

    # Execute batch approve
    use_case = BatchApproveProductsUseCase(repo)
    result = await use_case.execute(
        product_ids=[fake_id],
        tenant_id=tenant_id,
        user_id=reviewer_id,
    )

    # Assert failure
    assert result.approved_count == 0
    assert result.failed_count == 1
    assert len(result.results) == 1

    # Verify error details
    assert result.results[0].product_id == fake_id
    assert result.results[0].status == "failed"
    assert result.results[0].error_code == "not_found"
    message = result.results[0].message
    assert message is not None and "not found" in message.lower()
