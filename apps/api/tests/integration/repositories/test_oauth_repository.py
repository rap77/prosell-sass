"""Regression: linking an OAuth account and reading it back works end-to-end.

`OAuthAccountModel` stores `expires_at` as `DateTime(timezone=True)`. If the
repo (or its caller) hands a naive datetime to `link_oauth_account`, asyncpg
will either silently drop the tz or raise a DataError. More importantly,
`get_user_oauth_providers` must return a list with one entry per linked
provider — and the returned `created_at` must survive a tz-aware round trip
so downstream code that compares against `datetime.now(UTC)` doesn't break.

The OAuth use-case tests stub the repository, so the SQLAlchemy layer never
gets exercised. This test guards the real adapter against serialization
drift between the domain boundary and the DB.
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from prosell.infrastructure.repositories.oauth_repository_impl import (
    SqlAlchemyOAuthRepository,
)


@pytest.mark.asyncio
async def test_link_and_get_oauth_provider_roundtrips(db_session, test_user) -> None:
    repo = SqlAlchemyOAuthRepository(db_session)
    provider = "google"
    provider_user_id = f"ext-{uuid4().hex[:8]}"
    expires_at = datetime.now(UTC) + timedelta(hours=1)

    await repo.link_oauth_account(
        user_id=test_user.id,
        provider=provider,
        provider_user_id=provider_user_id,
        provider_email="ext-user@example.com",
        access_token="access-xyz",
        refresh_token="refresh-xyz",
        expires_at=expires_at,
    )

    providers = await repo.get_user_oauth_providers(test_user.id)
    assert len(providers) == 1
    entry = providers[0]
    assert entry["provider"] == provider
    assert entry["provider_user_id"] == provider_user_id
    assert entry["provider_email"] == "ext-user@example.com"
    # created_at is tz-aware (DateTime(timezone=True) on the column)
    assert entry["created_at"] is not None
    # The repo returns dict[str, object]; narrow created_at to datetime
    # via a local variable so pyright sees the tzinfo attribute.
    created_at: datetime = entry["created_at"]  # type: ignore[assignment]
    assert created_at.tzinfo is not None
