"""Integration tests — persistence of Product.archived_from_status.

Slice 3/10 of the reverse-transitions spec: archived_from_status must round
-trip through the DB so restore() can recover the pre-archive status after
a reload, not just within the same in-memory entity.
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
async def published_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    test_user: UserModel,
) -> Product:
    """A product already PUBLISHED, persisted."""
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
    product = await repo.update(product, changed_by_user_id=test_user.id)
    product.approve(test_user.id)
    return await repo.update(product, changed_by_user_id=test_user.id)


@pytest.mark.asyncio
async def test_create_persists_archived_from_status_as_none(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    repo = SqlAlchemyProductRepository(db_session)
    product = Product.create(
        title="2019 Honda Civic",
        price_cents=1_200_000,
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
    )

    created = await repo.create(product)
    fetched = await repo.get_by_id(created.id, created.tenant_id)

    assert fetched is not None
    assert fetched.archived_from_status is None


@pytest.mark.asyncio
async def test_archive_then_update_persists_archived_from_status(
    db_session: AsyncSession,
    published_product: Product,
    test_user: UserModel,
) -> None:
    repo = SqlAlchemyProductRepository(db_session)

    published_product.archive()
    await repo.update(published_product, changed_by_user_id=test_user.id)

    fetched = await repo.get_by_id(published_product.id, published_product.tenant_id)

    assert fetched is not None
    assert fetched.status == ProductStatus.ARCHIVED
    assert fetched.archived_from_status == "published"


@pytest.mark.asyncio
async def test_restore_after_reload_clears_archived_from_status(
    db_session: AsyncSession,
    published_product: Product,
    test_user: UserModel,
) -> None:
    repo = SqlAlchemyProductRepository(db_session)

    published_product.archive()
    await repo.update(published_product, changed_by_user_id=test_user.id)

    # Reload from DB to prove archived_from_status survives a round trip,
    # not just the in-memory entity from before the archive() call.
    reloaded = await repo.get_by_id(published_product.id, published_product.tenant_id)
    assert reloaded is not None

    reloaded.restore()
    await repo.update(reloaded, changed_by_user_id=test_user.id)

    fetched = await repo.get_by_id(reloaded.id, reloaded.tenant_id)

    assert fetched is not None
    assert fetched.status == ProductStatus.PUBLISHED
    assert fetched.archived_from_status is None
