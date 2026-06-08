"""Regression: TeamInvitation create + get_by_token + tenant isolation.

`TeamInvitation.create()` normalizes email to lowercase and stores a SHA256
token (64 hex chars). The repo's `get_by_token` and `get_by_email` rely on
exact match against the stored value. Two concerns guarded:

  1. The create path persists cleanly with tz-aware `expires_at` and a 64-char
     token (column is `String(64)` with `unique=True`).
  2. `get_by_token` enforces tenant isolation — a token issued in tenant A
     must NOT be retrievable from tenant B even if the token is known.
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.team import Team
from prosell.domain.entities.team_invitation import (
    TeamInvitation,
    TeamInvitationStatus,
)
from prosell.infrastructure.repositories.team_invitation_repository_impl import (
    SqlAlchemyTeamInvitationRepository,
)


def _make_invitation(tenant_id, team_id) -> TeamInvitation:
    return TeamInvitation.create(
        team_id=team_id,
        email=f"Invitee-{uuid4().hex[:6]}@Example.com",  # mixed case → normalized to lowercase
        role="vendor",
        tenant_id=tenant_id,
    )


@pytest.mark.asyncio
async def test_create_invitation_persists_and_get_by_token_works(
    db_session, test_organization
) -> None:
    """Round trip: create → flush → re-fetch by token returns the same id,
    email is normalized to lowercase, status is PENDING."""
    repo = SqlAlchemyTeamInvitationRepository(db_session)
    tenant_id = test_organization.tenant_id

    # FK requires a real team row
    team = Team.create(
        name=f"Team {uuid4().hex[:6]}",
        tenant_id=tenant_id,
        org_id=test_organization.id,
    )
    db_session.add(
        __import__("prosell.infrastructure.models.team_model", fromlist=["TeamModel"]).TeamModel(
            id=team.id,
            tenant_id=team.tenant_id,
            org_id=team.org_id,
            name=team.name,
            created_at=team.created_at,
            updated_at=team.updated_at,
        )
    )
    await db_session.flush()

    inv = _make_invitation(tenant_id, team.id)
    created = await repo.create(inv)

    assert created.id == inv.id
    assert created.email == inv.email  # already lowercased by the entity factory
    assert created.status == TeamInvitationStatus.PENDING
    assert len(created.token) == 64  # SHA256 hex digest

    fetched = await repo.get_by_token(created.token, tenant_id)
    assert fetched is not None
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_get_by_token_returns_none_for_wrong_tenant(db_session, test_organization) -> None:
    """A token issued in tenant A must NOT be retrievable from tenant B.
    Guards against a missing `tenant_id` predicate on get_by_token."""
    repo = SqlAlchemyTeamInvitationRepository(db_session)
    real_tenant = test_organization.tenant_id

    team = Team.create(
        name="T",
        tenant_id=real_tenant,
        org_id=test_organization.id,
    )
    db_session.add(
        __import__("prosell.infrastructure.models.team_model", fromlist=["TeamModel"]).TeamModel(
            id=team.id,
            tenant_id=team.tenant_id,
            org_id=team.org_id,
            name=team.name,
            created_at=team.created_at,
            updated_at=team.updated_at,
        )
    )
    await db_session.flush()

    inv = _make_invitation(real_tenant, team.id)
    created = await repo.create(inv)

    other_tenant = uuid4()
    fetched = await repo.get_by_token(created.token, other_tenant)

    assert fetched is None
