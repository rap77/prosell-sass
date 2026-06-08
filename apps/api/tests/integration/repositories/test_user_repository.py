"""Regression: a user created through the real domain factory persists.

`User.create()` returns a user in PENDING_VERIFICATION with a tz-aware
`created_at`. The repo serializes `backup_codes` (list[str]) to JSON on
write and must parse it back to a list on read — otherwise 2FA flows
that compare codes against the list will silently fail.

The user API tests mock the use case, so the SQLAlchemy adapter never
gets exercised. This test exercises the real create+get path against
the real DB so we surface serialization bugs (enum round-trip, JSON
column, tz-aware timestamps) before they hit production.
"""

import pytest

from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.user_repository_impl import (
    SqlAlchemyUserRepository,
)


@pytest.mark.asyncio
async def test_create_user_from_domain_factory_persists(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    repo = SqlAlchemyUserRepository(db_session)
    user = User.create(
        email=f"factory-{uuid4_unique()}@test.prosell.io",
        password_hash="hashed-pw",
        full_name="Factory User",
    )
    # Pin tenant_id to the test org for multi-tenant round-trip
    user.tenant_id = test_organization.tenant_id

    created = await repo.create(user)
    fetched = await repo.get_by_id(created.id)

    assert fetched is not None
    assert fetched.id == user.id
    assert fetched.email == user.email
    # status enum must come back as enum, not a bare string
    assert fetched.status == UserStatus.PENDING_VERIFICATION
    assert isinstance(fetched.status, UserStatus)
    # tenant_id must round-trip for multi-tenant filtering
    assert fetched.tenant_id == test_organization.tenant_id
    # created_at must be tz-aware (UTC), not naive
    assert fetched.created_at is not None
    assert fetched.created_at.tzinfo is not None


def uuid4_unique() -> str:
    from uuid import uuid4

    return uuid4().hex[:8]
