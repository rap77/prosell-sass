"""Integration: category reads include global (NULL-tenant) templates for
the product path WITHOUT weakening tenant isolation for mutations.

Foundation Plan 2 Task 6. After global-ization (Task 1) a product may
reference a GLOBAL category template (``tenant_id IS NULL``). The product
create/update path must be able to read those, but the shared ``get_by_id``
(which gates category MUTATIONS — see UpdateCategory/DeleteCategory use
cases) MUST stay strict so a tenant can never load+mutate a global template.

Requires the test DB on localhost:5433.
"""

from uuid import uuid4

import pytest

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)


async def _add_organization(db_session):
    """Create a real organization (categories.tenant_id has an FK to it)."""
    org_id = uuid4()
    org = OrganizationModel(
        id=org_id,
        name=f"Other Org {uuid4().hex[:8]}",
        tenant_id=org_id,
        status="active",
        description="Second org for cross-tenant isolation test",
        settings={},
    )
    db_session.add(org)
    await db_session.flush()
    return org


async def _add_category(db_session, *, tenant_id, name="Cat"):
    model = CategoryModel(
        id=uuid4(),
        name=f"{name} {uuid4().hex[:8]}",
        slug=f"cat-{uuid4().hex[:8]}",
        tenant_id=tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(model)
    await db_session.flush()
    return model


@pytest.mark.asyncio
async def test_get_by_id_or_global_returns_global_for_any_tenant(
    db_session, test_organization
):
    """A global (NULL-tenant) template is visible to any tenant."""
    global_cat = await _add_category(db_session, tenant_id=None, name="Global")
    repo = SqlAlchemyCategoryRepository(db_session)

    found = await repo.get_by_id_or_global(global_cat.id, test_organization.tenant_id)

    assert found is not None
    assert found.id == global_cat.id


@pytest.mark.asyncio
async def test_get_by_id_or_global_returns_own_tenant_category(
    db_session, test_organization
):
    """A tenant's own private category is still visible to it."""
    own = await _add_category(
        db_session, tenant_id=test_organization.tenant_id, name="Own"
    )
    repo = SqlAlchemyCategoryRepository(db_session)

    found = await repo.get_by_id_or_global(own.id, test_organization.tenant_id)

    assert found is not None
    assert found.id == own.id


@pytest.mark.asyncio
async def test_get_by_id_or_global_denies_other_tenants_private_category(
    db_session, test_organization
):
    """A DIFFERENT tenant's private category is NOT returned (no cross-tenant
    leak — this is why we don't reuse get_by_id_any_tenant for the product
    path)."""
    other_org = await _add_organization(db_session)
    other = await _add_category(
        db_session, tenant_id=other_org.tenant_id, name="Other"
    )
    repo = SqlAlchemyCategoryRepository(db_session)

    found = await repo.get_by_id_or_global(other.id, test_organization.tenant_id)

    assert found is None


@pytest.mark.asyncio
async def test_get_by_id_stays_strict_and_excludes_global(
    db_session, test_organization
):
    """Regression guard: the shared get_by_id (mutation gate) must NOT return
    global templates — otherwise a tenant could load+delete/edit a global
    template via UpdateCategory/DeleteCategory use cases."""
    global_cat = await _add_category(db_session, tenant_id=None, name="Global")
    repo = SqlAlchemyCategoryRepository(db_session)

    found = await repo.get_by_id(global_cat.id, test_organization.tenant_id)

    assert found is None
