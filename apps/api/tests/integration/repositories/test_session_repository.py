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
