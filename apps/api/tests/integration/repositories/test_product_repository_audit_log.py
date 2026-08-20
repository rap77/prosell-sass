"""Integration tests — ProductRepository status-change audit trail.

`update()` must record an immutable ProductAuditLog entry whenever the
product's status actually changes, and must NOT record one for non-status
edits. Mirrors the LeadRepository audit pattern.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.user_model import UserModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.fixture
async def pending_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    test_user: UserModel,
) -> Product:
    """A product already in PENDING. This transition itself is audited
    (DRAFT -> PENDING), so tests must account for that first log entry.
    """
    repo = SqlAlchemyProductRepository(db_session)
    product = Product.create(
        title="2020 Toyota Corolla",
        price_cents=1_500_000,
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
    )
    product = await repo.create(product)
    product.submit_for_approval(user_id=test_user.id)
    return await repo.update(product, changed_by_user_id=test_user.id)


@pytest.mark.asyncio
async def test_update_with_status_change_creates_audit_log(
    db_session: AsyncSession,
    pending_product: Product,
    test_user: UserModel,
) -> None:
    repo = SqlAlchemyProductRepository(db_session)

    pending_product.approve(test_user.id)
    await repo.update(
        pending_product,
        changed_by_user_id=test_user.id,
        reason="Looks good",
    )

    logs = await repo.get_audit_logs(pending_product.id, pending_product.tenant_id)

    # 1 entry from the fixture's DRAFT -> PENDING submit, plus this approval.
    assert len(logs) == 2
    approval_log = next(log for log in logs if log.new_status == ProductStatus.PUBLISHED)
    assert approval_log.old_status == ProductStatus.PENDING
    assert approval_log.changed_by_user_id == test_user.id
    assert approval_log.reason == "Looks good"


@pytest.mark.asyncio
async def test_update_without_status_change_does_not_add_audit_log(
    db_session: AsyncSession,
    pending_product: Product,
    test_user: UserModel,
) -> None:
    repo = SqlAlchemyProductRepository(db_session)

    logs_before = await repo.get_audit_logs(pending_product.id, pending_product.tenant_id)

    # Re-persist with no field changes at all -- status stays PENDING.
    await repo.update(pending_product, changed_by_user_id=test_user.id)

    logs_after = await repo.get_audit_logs(pending_product.id, pending_product.tenant_id)

    assert len(logs_after) == len(logs_before)


@pytest.mark.asyncio
async def test_get_audit_logs_returns_every_transition(
    db_session: AsyncSession,
    pending_product: Product,
    test_user: UserModel,
) -> None:
    repo = SqlAlchemyProductRepository(db_session)

    pending_product.reject(test_user.id, reason="Missing VIN")
    pending_product = await repo.update(
        pending_product, changed_by_user_id=test_user.id, reason="Missing VIN"
    )

    pending_product.submit_for_approval(user_id=test_user.id)
    await repo.update(pending_product, changed_by_user_id=test_user.id)

    logs = await repo.get_audit_logs(pending_product.id, pending_product.tenant_id)

    transitions = {(log.old_status, log.new_status) for log in logs}
    assert transitions == {
        (ProductStatus.DRAFT, ProductStatus.PENDING),  # from the fixture
        (ProductStatus.PENDING, ProductStatus.REJECTED),
        (ProductStatus.REJECTED, ProductStatus.PENDING),
    }
