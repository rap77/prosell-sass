"""Integration tests — ProductRepository.get_by_id tenant isolation.

GGA flagged: `get_by_id` declared `tenant_id: UUID` (required) but actually
accepted a magic sentinel (`UUID(int=0)`) to skip the tenant filter — the
type signature lied about the real contract. No caller in the codebase
ever passed that sentinel (confirmed via grep), so this is dead-but-risky
code: a future caller could pass it by accident and silently cross tenant
boundaries. Fixed to an explicit `tenant_id: UUID | None`.
"""

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.fixture
async def some_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> ProductModel:
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Some Product",
        price_cents=1_000_000,
    )
    db_session.add(product)
    await db_session.flush()
    return product


@pytest.mark.asyncio
async def test_get_by_id_with_none_tenant_skips_isolation(
    db_session: AsyncSession,
    some_product: ProductModel,
) -> None:
    """tenant_id=None is the explicit, type-honest way to bypass isolation."""
    repo = SqlAlchemyProductRepository(db_session)

    result = await repo.get_by_id(some_product.id, tenant_id=None)

    assert result is not None
    assert result.id == some_product.id


@pytest.mark.asyncio
async def test_get_by_id_with_wrong_tenant_returns_none(
    db_session: AsyncSession,
    some_product: ProductModel,
) -> None:
    """Regression: a real (non-None) tenant_id still enforces isolation."""
    repo = SqlAlchemyProductRepository(db_session)

    result = await repo.get_by_id(some_product.id, tenant_id=uuid4())

    assert result is None
