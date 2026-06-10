"""Regression: Organization repo create + get_by_tenant_id + JSON settings round-trip.

`Organization.create(name, tenant_id)` is self-referential: `id == tenant_id`
and `tenant_id` has a UNIQUE constraint. `OrganizationModel.settings` is a
JSON column. Two concerns guarded:

  1. The create path persists cleanly with tz-aware timestamps and the
     self-referential id/tenant_id relationship.
  2. `get_by_tenant_id` returns the right org when there are multiple
     organizations in the table (catches a missing `tenant_id` filter
     that would return the first one always).
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.organization import Organization
from prosell.infrastructure.repositories.organization_repository_impl import (
    SqlAlchemyOrganizationRepository,
)


@pytest.mark.asyncio
async def test_create_organization_persists_self_referential_id(
    db_session,
) -> None:
    """`Organization.create(name, tenant_id)` sets `id == tenant_id`. The
    repo must persist that as-is, and `get_by_tenant_id` must find it."""
    repo = SqlAlchemyOrganizationRepository(db_session)
    tenant_id = uuid4()

    org = Organization.create(
        name=f"Acme {uuid4().hex[:6]}",
        tenant_id=tenant_id,
    )

    created = await repo.create(org)

    assert created.id == tenant_id
    assert created.tenant_id == tenant_id
    assert created.name == org.name

    fetched = await repo.get_by_tenant_id(tenant_id)
    assert fetched is not None
    assert fetched.id == tenant_id
    assert fetched.name == created.name


@pytest.mark.asyncio
async def test_get_by_tenant_id_returns_none_for_unknown_tenant(
    db_session,
) -> None:
    """Looking up a tenant that doesn't exist returns None (not a stale row
    from another tenant). Catches a bug where the query forgot the
    `tenant_id` predicate and returned the first row."""
    repo = SqlAlchemyOrganizationRepository(db_session)

    # Insert one org
    real_tenant = uuid4()
    await repo.create(Organization.create(name="Real", tenant_id=real_tenant))

    # Lookup with a different tenant
    fetched = await repo.get_by_tenant_id(uuid4())
    assert fetched is None


@pytest.mark.asyncio
async def test_update_organization_merges_settings_json(db_session, test_user) -> None:
    """`settings` is a JSON column. `update_settings()` deep-merges via the
    domain entity. The repo's `update()` should write the new merged dict
    and the re-fetched entity should reflect it."""

    repo = SqlAlchemyOrganizationRepository(db_session)
    tenant_id = uuid4()
    org = Organization.create(name="JsonOrg", tenant_id=tenant_id)
    await repo.create(org)

    # Set verified_by via the entity (must be a real user FK) and update settings
    org.verify(verifier_id=test_user.id)
    org.update_settings({"theme": "dark", "lang": "en"})

    updated = await repo.update(org)

    assert updated.status.value == "active"
    assert updated.settings.get("theme") == "dark"
    assert updated.settings.get("lang") == "en"

    # Re-fetch and confirm persistence
    fetched = await repo.get_by_tenant_id(tenant_id)
    assert fetched is not None
    assert fetched.settings.get("theme") == "dark"
    assert fetched.verified_by == test_user.id
    assert fetched.verified_at is not None
