"""Integration tests — optimistic locking on Product.version.

Slice 4/10 of the reverse-transitions spec. repo.update() must increment
version on every successful write and reject a write from an entity fetched
at a stale version, instead of silently overwriting a concurrent change.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.product import Product
from prosell.domain.exceptions.product_exceptions import ProductVersionConflictError
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.user_model import UserModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.fixture
async def draft_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> Product:
    repo = SqlAlchemyProductRepository(db_session)
    product = Product.create(
        title="2020 Toyota Corolla",
        price_cents=1_500_000,
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
    )
    return await repo.create(product)


@pytest.mark.asyncio
async def test_create_sets_version_to_one(draft_product: Product) -> None:
    assert draft_product.version == 1


@pytest.mark.asyncio
async def test_update_with_matching_version_succeeds_and_increments_version(
    db_session: AsyncSession,
    draft_product: Product,
    test_user: UserModel,
) -> None:
    repo = SqlAlchemyProductRepository(db_session)

    draft_product.update_basic_info(title="2020 Toyota Corolla LE")
    updated = await repo.update(draft_product, changed_by_user_id=test_user.id)

    assert updated.version == 2
    assert updated.title == "2020 Toyota Corolla LE"


@pytest.mark.asyncio
async def test_update_with_stale_version_raises_conflict(
    db_session: AsyncSession,
    draft_product: Product,
    test_user: UserModel,
) -> None:
    repo = SqlAlchemyProductRepository(db_session)

    # First writer succeeds, bumping the DB row to version 2.
    draft_product.update_basic_info(title="First writer's title")
    await repo.update(draft_product, changed_by_user_id=test_user.id)

    # Second writer holds a copy fetched before the first write (version 1).
    stale_copy = draft_product.model_copy(deep=True)
    stale_copy.update_basic_info(title="Second writer's title")

    with pytest.raises(ProductVersionConflictError):
        await repo.update(stale_copy, changed_by_user_id=test_user.id)

    fetched = await repo.get_by_id(draft_product.id, draft_product.tenant_id)
    assert fetched is not None
    assert fetched.title == "First writer's title"
    assert fetched.version == 2
