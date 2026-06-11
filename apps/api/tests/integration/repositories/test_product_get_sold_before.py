"""Integration test for SqlAlchemyProductRepository.get_sold_before.

Backs the storage-prune sweep: the daily job needs to fetch products that
have been SOLD since before a cutoff (and only those) so it can delete their
non-cover images.
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.mark.asyncio
async def test_get_sold_before_returns_only_old_sold(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    repo = SqlAlchemyProductRepository(db_session)
    now = datetime.now(UTC)

    async def _make(status: ProductStatus, sold_delta_days: int | None) -> Product:
        product = Product.create(
            tenant_id=test_organization.id,
            organization_id=test_organization.id,
            title="P",
            slug=f"p-{uuid4().hex[:8]}",
            description="d",
            price_cents=1000,
            currency="USD",
            category_id=test_category.id,
        )
        product.status = status
        product.sold_at = None if sold_delta_days is None else now - timedelta(days=sold_delta_days)
        await repo.create(product)
        return product

    old_sold = await _make(ProductStatus.SOLD, 40)  # eligible: sold > 30d ago
    recent_sold = await _make(ProductStatus.SOLD, 10)  # within grace
    published = await _make(ProductStatus.PUBLISHED, None)  # not sold

    cutoff = now - timedelta(days=30)
    result = await repo.get_sold_before(cutoff)
    ids = {p.id for p in result}

    assert old_sold.id in ids
    assert recent_sold.id not in ids
    assert published.id not in ids
