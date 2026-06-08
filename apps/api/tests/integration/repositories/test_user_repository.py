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

from datetime import UTC, datetime, timedelta

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


@pytest.mark.asyncio
async def test_update_preserves_entity_updated_at(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    """GAP-5: UserRepositoryImpl.update() must not overwrite entity.updated_at.

    The entity's domain methods (update_password, verify_email, etc.) are
    the source of truth for `updated_at` — they set it to datetime.now(UTC)
    at the moment of the domain event. The repo's job on update is to
    persist what the entity carries, not to re-stamp the timestamp.
    Overwriting it breaks audit trails (e.g., when an event handler applies
    a delayed mutation, the wall-clock at the repo would be later than the
    domain event time).
    """
    repo = SqlAlchemyUserRepository(db_session)
    user = User.create(
        email=f"updated-at-{uuid4_unique()}@test.prosell.io",
        password_hash="hashed-pw",
        full_name="UpdatedAt User",
    )
    user.tenant_id = test_organization.tenant_id
    created = await repo.create(user)

    # Pin entity.updated_at to a specific, known moment in the past —
    # distinct from "now" at the moment repo.update() will execute.
    pinned = datetime.now(UTC) - timedelta(hours=1)
    created.updated_at = pinned
    created.full_name = "Renamed"

    await repo.update(created)
    fetched = await repo.get_by_id(created.id)

    assert fetched is not None
    # Repo must persist what the entity carries, not re-stamp.
    assert fetched.updated_at == pinned


@pytest.mark.asyncio
async def test_delete_soft_deletes_with_deleted_at_audit_trail(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    """GAP-5: UserRepositoryImpl.delete() must soft-delete via deleted_at.

    The previous implementation set `status = SUSPENDED`, which conflates
    two distinct domain events: an admin "suspend" (temporary block) and
    a tenant "delete" (intentional removal with audit trail). The proper
    soft-delete contract is:

    1. The row is NOT hard-deleted (still fetchable via get_by_id).
    2. `user.is_deleted()` returns True after delete.
    3. `user.deleted_at` is set to a recent tz-aware datetime.
    4. `user.status` is unchanged from its prior value (delete is a
       separate dimension from the status enum).
    """
    repo = SqlAlchemyUserRepository(db_session)
    user = User.create(
        email=f"delete-{uuid4_unique()}@test.prosell.io",
        password_hash="hashed-pw",
        full_name="Delete Me",
    )
    user.tenant_id = test_organization.tenant_id
    user.verify_email()  # status -> ACTIVE
    created = await repo.create(user)
    assert created.status == UserStatus.ACTIVE

    await repo.delete(created.id)

    # 1. Row still exists (no hard delete)
    fetched = await repo.get_by_id(created.id)
    assert fetched is not None
    # 2. is_deleted() reflects the soft-delete
    assert fetched.is_deleted()
    # 3. deleted_at is set to a recent tz-aware datetime
    assert fetched.deleted_at is not None
    assert fetched.deleted_at.tzinfo is not None
    # 4. status is unchanged — delete is a separate dimension
    assert fetched.status == UserStatus.ACTIVE


@pytest.mark.asyncio
async def test_delete_is_distinguishable_from_suspend(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    """GAP-5: `delete` and `suspend` must not produce identical entity state.

    Suspending a user (admin action, temporary block) must NOT set
    `deleted_at`. Soft-deleting a user (tenant action, intentional removal)
    must. The two operations differ in intent and audit semantics.
    """
    repo = SqlAlchemyUserRepository(db_session)

    # Suspended user — deleted_at must remain None
    suspended = User.create(
        email=f"suspend-{uuid4_unique()}@test.prosell.io",
        password_hash="hashed-pw",
        full_name="Suspended",
    )
    suspended.tenant_id = test_organization.tenant_id
    suspended.verify_email()
    suspended.suspend()
    suspended_created = await repo.create(suspended)
    assert suspended_created.status == UserStatus.SUSPENDED
    assert not suspended_created.is_deleted()

    # Deleted user — deleted_at must be set
    deleted = User.create(
        email=f"del-{uuid4_unique()}@test.prosell.io",
        password_hash="hashed-pw",
        full_name="Deleted",
    )
    deleted.tenant_id = test_organization.tenant_id
    deleted.verify_email()
    deleted_created = await repo.create(deleted)
    await repo.delete(deleted_created.id)
    fetched_deleted = await repo.get_by_id(deleted_created.id)

    assert fetched_deleted is not None
    assert fetched_deleted.is_deleted()
    # Suspended has NO deleted_at — this is what makes them distinguishable.
    fetched_suspended = await repo.get_by_id(suspended_created.id)
    assert fetched_suspended is not None
    assert fetched_suspended.deleted_at is None
    assert not fetched_suspended.is_deleted()


@pytest.mark.asyncio
async def test_backup_codes_empty_list_round_trips_as_empty_list(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    """GAP-5: `backup_codes=[]` must round-trip as `[]`, not collapse to None.

    The old code stored `backup_codes` as TEXT and serialized with
    `json.dumps(...) if user.backup_codes else None`. The truthiness check
    treats `[]` as falsy, so an empty list silently became NULL in the DB
    — losing the distinction between "no codes configured" and
    "all codes used up" (the user entity's `use_backup_code` removes codes
    one by one; the last removal can land on an empty list, not None).

    After the fix, the round-trip must preserve the empty list faithfully.
    """
    repo = SqlAlchemyUserRepository(db_session)
    user = User.create(
        email=f"backup-empty-{uuid4_unique()}@test.prosell.io",
        password_hash="hashed-pw",
        full_name="Backup Empty",
    )
    user.tenant_id = test_organization.tenant_id
    # Enable 2FA then consume all codes so backup_codes becomes []
    user.enable_2fa(totp_secret="JBSWY3DPEHPK3PXP", backup_codes=["a", "b", "c"])
    user.use_backup_code("a")
    user.use_backup_code("b")
    user.use_backup_code("c")
    assert user.backup_codes == []

    created = await repo.create(user)
    fetched = await repo.get_by_id(created.id)

    assert fetched is not None
    # Must round-trip as [] (empty list), not collapse to None
    assert fetched.backup_codes == []
    assert fetched.backup_codes is not None


@pytest.mark.asyncio
async def test_backup_codes_nonempty_list_round_trips(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    """GAP-5: `backup_codes=["a","b"]` must round-trip as a list of str.

    After switching the column to JSONB (native Postgres JSON), the list
    is round-tripped by SQLAlchemy without manual json.dumps/loads. The
    result must be a Python list of str, in the same order, with no
    coercion to None or to a JSON string.
    """
    repo = SqlAlchemyUserRepository(db_session)
    user = User.create(
        email=f"backup-full-{uuid4_unique()}@test.prosell.io",
        password_hash="hashed-pw",
        full_name="Backup Full",
    )
    user.tenant_id = test_organization.tenant_id
    user.enable_2fa(totp_secret="JBSWY3DPEHPK3PXP", backup_codes=["alpha", "beta", "gamma"])
    created = await repo.create(user)
    fetched = await repo.get_by_id(created.id)

    assert fetched is not None
    assert fetched.backup_codes == ["alpha", "beta", "gamma"]
    assert isinstance(fetched.backup_codes, list)
    assert all(isinstance(c, str) for c in fetched.backup_codes)


@pytest.mark.asyncio
async def test_backup_codes_none_round_trips_as_none(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    """GAP-5: `backup_codes=None` (no 2FA) must round-trip as None, not []."""
    repo = SqlAlchemyUserRepository(db_session)
    user = User.create(
        email=f"backup-none-{uuid4_unique()}@test.prosell.io",
        password_hash="hashed-pw",
        full_name="Backup None",
    )
    user.tenant_id = test_organization.tenant_id
    assert user.backup_codes is None

    created = await repo.create(user)
    fetched = await repo.get_by_id(created.id)

    assert fetched is not None
    assert fetched.backup_codes is None


def uuid4_unique() -> str:
    from uuid import uuid4

    return uuid4().hex[:8]
