"""Regression: Team repository create/get + tenant-scoped get_by_id work end-to-end.

`Team.create()` stamps tz-aware timestamps; the `teams` columns are
`DateTime(timezone=True)`. Two concerns guarded:
  1. The create path persists cleanly through SQLAlchemy.
  2. `get_by_id` enforces tenant isolation — a team in tenant A is invisible
     to a lookup with tenant B (catches a missing WHERE clause on tenant_id).
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.team import Team
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.team_repository_impl import (
    SqlAlchemyTeamRepository,
)


@pytest.mark.asyncio
async def test_create_team_persists_and_get_by_id_returns_entity(
    db_session, test_organization
) -> None:
    """`Team.create()` → repo → DB → repo.get_by_id round trip preserves
    id, name, org_id and tz-aware timestamps."""
    repo = SqlAlchemyTeamRepository(db_session)
    tenant_id = test_organization.tenant_id
    org_id = test_organization.id

    team = Team.create(
        name=f"Sales Team {uuid4().hex[:6]}",
        tenant_id=tenant_id,
        org_id=org_id,
    )

    created = await repo.create(team)

    assert created.id == team.id
    assert created.tenant_id == tenant_id
    assert created.org_id == org_id
    assert created.name == team.name
    assert created.created_at is not None

    fetched = await repo.get_by_id(created.id, tenant_id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.name == created.name


@pytest.mark.asyncio
async def test_get_by_id_returns_none_for_wrong_tenant(db_session, test_organization) -> None:
    """A team persisted in tenant A must NOT be returned for a lookup with
    tenant B. Guards against a missing `tenant_id` predicate on get_by_id."""
    repo = SqlAlchemyTeamRepository(db_session)
    real_tenant = test_organization.tenant_id

    team = Team.create(
        name="Tenant A Team",
        tenant_id=real_tenant,
        org_id=test_organization.id,
    )
    await repo.create(team)

    # Lookup with a *different* tenant id
    other_tenant = uuid4()
    fetched = await repo.get_by_id(team.id, other_tenant)

    assert fetched is None


@pytest.mark.asyncio
async def test_get_by_org_scopes_to_tenant(db_session, test_organization) -> None:
    """`get_by_org(org_id, tenant_id)` must NOT leak teams from other tenants
    that share the same org_id (defense-in-depth alongside the FK)."""
    repo = SqlAlchemyTeamRepository(db_session)
    real_tenant = test_organization.tenant_id
    other_tenant = uuid4()

    # Team in the real tenant
    real_team = Team.create(
        name="Real Tenant Team",
        tenant_id=real_tenant,
        org_id=test_organization.id,
    )
    await repo.create(real_team)

    # A second org + a team that lives in another tenant
    other_org = OrganizationModel(
        id=uuid4(),
        tenant_id=other_tenant,
        name=f"Other {uuid4().hex[:6]}",
        status="active",
        settings={},
    )
    db_session.add(other_org)
    await db_session.flush()

    other_team = Team.create(
        name="Other Tenant Team",
        tenant_id=other_tenant,
        org_id=other_org.id,
    )
    await repo.create(other_team)

    # Lookup scoped to the real org + real tenant
    teams = await repo.get_by_org(test_organization.id, real_tenant)
    ids = {t.id for t in teams}

    assert real_team.id in ids
    assert other_team.id not in ids
