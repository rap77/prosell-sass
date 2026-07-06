"""Integration tests for ProductOwnershipRepository.

The product_ownership table is the M2M bridge that lets a product have N
owners (organizations/brokers) with percentage shares. Any product type
can have shared ownership (vehicles, real estate, equipment, etc.).
"""

from decimal import Decimal
from uuid import uuid4

import pytest

from prosell.domain.entities.category import Category
from prosell.domain.entities.product import Product
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.product_ownership_repository_impl import (
    SqlAlchemyProductOwnershipRepository,
)
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)


@pytest.fixture
async def product_with_category(db_session, test_organization):
    """Create a product with a valid category for testing ownership."""
    cat_repo = SqlAlchemyCategoryRepository(db_session)
    category = await cat_repo.create(
        Category.create(
            name="Test Vehicles",
            slug=f"test-veh-{uuid4().hex[:6]}",
            tenant_id=test_organization.tenant_id,
            level=0,
        )
    )

    product_repo = SqlAlchemyProductRepository(db_session)
    product = await product_repo.create(
        Product.create(
            title="Toyota Corolla 2024",
            tenant_id=test_organization.tenant_id,
            organization_id=test_organization.id,
            category_id=category.id,
            price_cents=2500000,  # $25,000 in cents
            currency="USD",
        )
    )
    return product


@pytest.mark.asyncio
async def test_add_single_owner(db_session, test_organization, product_with_category):
    """A product can have a single owner with 100%."""
    repo = SqlAlchemyProductOwnershipRepository(db_session)

    await repo.add_owner(
        product_id=product_with_category.id,
        owner_id=test_organization.id,
        percentage=Decimal("100.00"),
    )

    owners = await repo.list_owners(product_with_category.id)
    assert len(owners) == 1
    assert owners[0].owner_id == test_organization.id
    assert owners[0].percentage == Decimal("100.00")


@pytest.mark.asyncio
async def test_add_multiple_owners(
    db_session, test_organization, second_organization, product_with_category
):
    """A product can have multiple owners with percentage shares."""
    repo = SqlAlchemyProductOwnershipRepository(db_session)

    await repo.add_owner(
        product_id=product_with_category.id,
        owner_id=test_organization.id,
        percentage=Decimal("60.00"),
    )
    await repo.add_owner(
        product_id=product_with_category.id,
        owner_id=second_organization.id,
        percentage=Decimal("40.00"),
    )

    owners = await repo.list_owners(product_with_category.id)
    assert len(owners) == 2

    percentages = {o.owner_id: o.percentage for o in owners}
    assert percentages[test_organization.id] == Decimal("60.00")
    assert percentages[second_organization.id] == Decimal("40.00")


@pytest.mark.asyncio
async def test_update_owner_percentage(db_session, test_organization, product_with_category):
    """Owner percentage can be updated."""
    repo = SqlAlchemyProductOwnershipRepository(db_session)

    await repo.add_owner(
        product_id=product_with_category.id,
        owner_id=test_organization.id,
        percentage=Decimal("100.00"),
    )

    await repo.update_percentage(
        product_id=product_with_category.id,
        owner_id=test_organization.id,
        percentage=Decimal("75.00"),
    )

    owners = await repo.list_owners(product_with_category.id)
    assert owners[0].percentage == Decimal("75.00")


@pytest.mark.asyncio
async def test_remove_owner(
    db_session, test_organization, second_organization, product_with_category
):
    """An owner can be removed from a product."""
    repo = SqlAlchemyProductOwnershipRepository(db_session)

    await repo.add_owner(product_with_category.id, test_organization.id, Decimal("60.00"))
    await repo.add_owner(product_with_category.id, second_organization.id, Decimal("40.00"))

    await repo.remove_owner(product_with_category.id, second_organization.id)

    owners = await repo.list_owners(product_with_category.id)
    assert len(owners) == 1
    assert owners[0].owner_id == test_organization.id


@pytest.mark.asyncio
async def test_get_total_percentage(
    db_session, test_organization, second_organization, product_with_category
):
    """Can calculate total percentage for validation."""
    repo = SqlAlchemyProductOwnershipRepository(db_session)

    await repo.add_owner(product_with_category.id, test_organization.id, Decimal("60.00"))
    await repo.add_owner(product_with_category.id, second_organization.id, Decimal("40.00"))

    total = await repo.get_total_percentage(product_with_category.id)
    assert total == Decimal("100.00")


@pytest.mark.asyncio
async def test_clear_ownership(
    db_session, test_organization, second_organization, product_with_category
):
    """All ownership can be cleared for a product."""
    repo = SqlAlchemyProductOwnershipRepository(db_session)

    await repo.add_owner(product_with_category.id, test_organization.id, Decimal("60.00"))
    await repo.add_owner(product_with_category.id, second_organization.id, Decimal("40.00"))

    await repo.clear_ownership(product_with_category.id)

    owners = await repo.list_owners(product_with_category.id)
    assert len(owners) == 0
