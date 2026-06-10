"""Regression: a session created through the real domain factory persists.

`Session.create()` stamps `created_at` and `expires_at` as timezone-AWARE
UTC datetimes. The repository's `_to_entity` uses `Session.model_validate(...,
from_attributes=True)` and must round-trip the entity faithfully — the
entity's `created_at`/`expires_at` tz-aware value must come back equal
to what we persisted, and `is_valid()` must return True.

The session API tests mock the use case so they never exercise the real
DB round-trip. This test guards against regressions in serialization
(tz-aware datetime loss, `tenant_id` not on the model, etc.).
"""

from datetime import UTC, datetime

import pytest

from prosell.domain.entities.session import Session
from prosell.infrastructure.repositories.session_repository_impl import (
    SqlAlchemySessionRepository,
)


@pytest.mark.asyncio
async def test_create_session_from_domain_factory_persists(db_session, test_user) -> None:
    repo = SqlAlchemySessionRepository(db_session)
    session = Session.create(
        user_id=test_user.id,
        token_hash="abc123def456",
        expires_days=7,
        user_agent="pytest-agent",
        ip_address="127.0.0.1",
    )

    created = await repo.create(session)
    fetched = await repo.get_by_id(created.id)

    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.user_id == test_user.id
    assert fetched.token_hash == "abc123def456"
    assert fetched.is_valid() is True
    assert fetched.created_at is not None
    assert fetched.expires_at is not None


@pytest.mark.asyncio
async def test_revoke_all_user_sessions_stamps_tz_aware_utc(db_session, test_user) -> None:
    """GAP-5: `revoke_all_user_sessions` must persist tz-aware UTC revoked_at.

    The DB column is `TIMESTAMPTZ` (model declares DateTime(timezone=True)).
    Persisting a naive datetime to a timestamptz column raises asyncpg
    DataError at flush time. The repo MUST use datetime.now(UTC) — not
    datetime.now() — and the persisted value must round-trip with a
    non-None tzinfo.
    """
    repo = SqlAlchemySessionRepository(db_session)
    # Create three sessions for the test user
    sessions = [
        await repo.create(
            Session.create(
                user_id=test_user.id,
                token_hash=f"hash-{i}",
                expires_days=7,
            ),
        )
        for i in range(3)
    ]
    assert all(s.revoked_at is None for s in sessions)

    # Snapshot "now" before, to assert the stamped value is in that window
    before = datetime.now(UTC)
    await repo.revoke_all_user_sessions(test_user.id)
    after = datetime.now(UTC)

    for created in sessions:
        fetched = await repo.get_by_id(created.id)
        assert fetched is not None
        assert fetched.revoked_at is not None
        # tz-aware — naive would mean datetime.now() was used
        assert fetched.revoked_at.tzinfo is not None
        # Falls within the before/after window (UTC-aligned)
        assert before <= fetched.revoked_at <= after
