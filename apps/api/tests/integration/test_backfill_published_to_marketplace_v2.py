"""Integration test for the 20260822_0001 backfill migration's SQL predicate.

Proves the widened predicate (published_to_marketplace=false AND
approved_at IS NOT NULL) repairs previously-approved products regardless
of current status, and leaves everything else untouched — the gap a
Critical finding surfaced in the final whole-branch review of
docs/superpowers/specs/2026-08-21-marketplace-publish-fusion-design.md.
"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel

MIGRATION_SQL = (
    "UPDATE products "
    "SET published_to_marketplace = true "
    "WHERE published_to_marketplace = false AND approved_at IS NOT NULL"
)


async def _create_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    *,
    status: str,
    approved_at: datetime | None,
    published_to_marketplace: bool,
) -> ProductModel:
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Test Vehicle",
        price_cents=1_000_000,
        status=status,
        approved_at=approved_at,
        published_to_marketplace=published_to_marketplace,
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_backfill_repairs_previously_approved_non_published_rows(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    now = datetime.now(UTC)

    # Should be repaired: approved at some point, flag still false, whatever the current status.
    paused = await _create_product(
        db_session,
        test_organization,
        test_category,
        status="paused",
        approved_at=now,
        published_to_marketplace=False,
    )
    reserved = await _create_product(
        db_session,
        test_organization,
        test_category,
        status="reserved",
        approved_at=now,
        published_to_marketplace=False,
    )
    sold = await _create_product(
        db_session,
        test_organization,
        test_category,
        status="sold",
        approved_at=now,
        published_to_marketplace=False,
    )
    archived = await _create_product(
        db_session,
        test_organization,
        test_category,
        status="archived",
        approved_at=now,
        published_to_marketplace=False,
    )

    # Should NOT be touched: never approved.
    draft_never_approved = await _create_product(
        db_session,
        test_organization,
        test_category,
        status="draft",
        approved_at=None,
        published_to_marketplace=False,
    )
    pending_never_approved = await _create_product(
        db_session,
        test_organization,
        test_category,
        status="pending",
        approved_at=None,
        published_to_marketplace=False,
    )

    # Should NOT be touched: already true (idempotence check — no-op, not a flip-back).
    already_true = await _create_product(
        db_session,
        test_organization,
        test_category,
        status="published",
        approved_at=now,
        published_to_marketplace=True,
    )

    # Capture (id, status) before the migration expires these instances —
    # accessing an expired attribute mid-test would trigger a lazy refresh
    # outside of an awaited context.
    should_be_repaired = [(p.id, p.status) for p in (paused, reserved, sold, archived)]
    should_be_untouched = [(p.id, p.status) for p in (draft_never_approved, pending_never_approved)]
    already_true_id = already_true.id

    await db_session.execute(text(MIGRATION_SQL))
    await db_session.flush()
    db_session.expire_all()

    for product_id, status in should_be_repaired:
        refreshed = await db_session.scalar(
            select(ProductModel).where(ProductModel.id == product_id)
        )
        assert refreshed is not None
        assert refreshed.published_to_marketplace is True, (
            f"{status} product with approved_at set should have been repaired"
        )

    for product_id, status in should_be_untouched:
        refreshed = await db_session.scalar(
            select(ProductModel).where(ProductModel.id == product_id)
        )
        assert refreshed is not None
        assert refreshed.published_to_marketplace is False, (
            f"{status} product never approved should NOT have been touched"
        )

    refreshed_already_true = await db_session.scalar(
        select(ProductModel).where(ProductModel.id == already_true_id)
    )
    assert refreshed_already_true is not None
    assert refreshed_already_true.published_to_marketplace is True
