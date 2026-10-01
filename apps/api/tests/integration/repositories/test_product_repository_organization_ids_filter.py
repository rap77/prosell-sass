"""Integration tests: `organization_ids` IN-filter on `get_all`/`count`.

Catalog multi-select filter/export — a caller picks a SET of
organizations (not "all", not just one). Covers the repository's
`organization_ids` filter in isolation from the use-case/router layers
above it (already covered by their own unit tests).

Requires the test DB running on port 5433 (same fixtures as
test_product_repository_attribute_filters.py: db_session, test_organization).
"""

from collections.abc import AsyncGenerator
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.product import Product
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.product_repository_impl import (
    SqlAlchemyProductRepository,
)

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def product_repo(db_session: AsyncSession) -> SqlAlchemyProductRepository:
    """Real repository backed by the test DB session."""
    return SqlAlchemyProductRepository(db_session)


@pytest_asyncio.fixture
async def second_organization(db_session: AsyncSession) -> AsyncGenerator[OrganizationModel]:
    """A second organization, independent of `test_organization` — the
    multi-select scenario this file tests needs at least two."""
    org_id: UUID = uuid4()
    org = OrganizationModel(
        id=org_id,
        name=f"Second Test Org {uuid4().hex[:8]}",
        tenant_id=org_id,
        status="active",
        description="Second test organization for organization_ids filter tests",
        settings={},
    )
    db_session.add(org)
    await db_session.flush()
    yield org


@pytest_asyncio.fixture
async def third_organization(db_session: AsyncSession) -> AsyncGenerator[OrganizationModel]:
    """A THIRD organization, deliberately left OUT of every `organization_ids`
    filter in this file — its product must never appear in a filtered result."""
    org_id: UUID = uuid4()
    org = OrganizationModel(
        id=org_id,
        name=f"Third Test Org {uuid4().hex[:8]}",
        tenant_id=org_id,
        status="active",
        description="Third test organization — never selected",
        settings={},
    )
    db_session.add(org)
    await db_session.flush()
    yield org


async def test_organization_ids_filter_scopes_to_the_selected_set(
    product_repo: SqlAlchemyProductRepository,
    test_organization: OrganizationModel,
    second_organization: OrganizationModel,
    third_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    """`get_all(organization_ids=[A, B])` returns only A's and B's
    products — never C's, even though C exists and is published too."""
    for org in (test_organization, second_organization, third_organization):
        product = Product.create(
            title=f"Product for {org.name}",
            price_cents=1_000_000,
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=test_category.id,
            condition=ProductCondition.USED,
        )
        await product_repo.create(product)

    results = await product_repo.get_all(
        tenant_id=None,
        organization_ids=[test_organization.id, second_organization.id],
        limit=100,
    )

    returned_org_ids = {p.organization_id for p in results}
    assert returned_org_ids == {test_organization.id, second_organization.id}
    assert third_organization.id not in returned_org_ids


async def test_organization_ids_filter_count_matches_get_all(
    product_repo: SqlAlchemyProductRepository,
    test_organization: OrganizationModel,
    second_organization: OrganizationModel,
    third_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    """`count()` mirrors `get_all()`'s `organization_ids` filter exactly —
    same invariant `_apply_product_filters` already guarantees for every
    other filter."""
    for org in (test_organization, second_organization, third_organization):
        product = Product.create(
            title=f"Product for {org.name}",
            price_cents=1_000_000,
            tenant_id=org.tenant_id,
            organization_id=org.id,
            category_id=test_category.id,
            condition=ProductCondition.USED,
        )
        await product_repo.create(product)

    total = await product_repo.count(
        tenant_id=None,
        organization_ids=[test_organization.id, second_organization.id],
    )

    assert total == 2


async def test_organization_ids_takes_precedence_over_organization_id(
    product_repo: SqlAlchemyProductRepository,
    test_organization: OrganizationModel,
    second_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    """A non-empty `organization_ids` wins over a simultaneously-passed
    singular `organization_id` — mirrors `all_organizations` winning over
    `organization_id` at the use-case/router layer."""
    product_a = Product.create(
        title="Product A",
        price_cents=1_000_000,
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        condition=ProductCondition.USED,
    )
    product_b = Product.create(
        title="Product B",
        price_cents=1_000_000,
        tenant_id=second_organization.tenant_id,
        organization_id=second_organization.id,
        category_id=test_category.id,
        condition=ProductCondition.USED,
    )
    await product_repo.create(product_a)
    await product_repo.create(product_b)

    # `organization_id` names ONLY org A, but `organization_ids` names
    # BOTH — the result must include B too, proving `organization_ids` won.
    results = await product_repo.get_all(
        tenant_id=None,
        organization_id=test_organization.id,
        organization_ids=[test_organization.id, second_organization.id],
        limit=100,
    )

    returned_org_ids = {p.organization_id for p in results}
    assert returned_org_ids == {test_organization.id, second_organization.id}
