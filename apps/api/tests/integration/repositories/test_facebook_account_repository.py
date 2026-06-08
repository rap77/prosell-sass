"""Regression: a Facebook OAuth account persisted through the real
``FacebookAccount.create()`` factory round-trips with its scopes list
intact, the token stored verbatim (already encrypted by the use case),
and ``get_by_seller_user_id`` finds it.

The scopes are persisted as a JSON string in the ``scopes`` column and
must come back as a ``list[str]`` on re-fetch. If a future refactor
forgets to deserialize (or double-encodes) the JSON, the use case layer
that filters by ``"pages_manage_posts" in scopes`` would silently break.
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from prosell.domain.entities.facebook_account import (
    FacebookAccount,
    FacebookAccountStatus,
)
from prosell.infrastructure.repositories.facebook_account_repository_impl import (
    SqlAlchemyFacebookAccountRepository,
)


@pytest.mark.asyncio
async def test_create_and_get_facebook_account_roundtrips(
    db_session,
    test_user,
) -> None:
    """Domain-created account persists, scopes survive JSON round-trip."""
    seller_id = test_user.id
    expires_at = datetime.now(UTC) + timedelta(days=60)
    account = FacebookAccount.create(
        seller_user_id=seller_id,
        facebook_user_id=f"fb-{uuid4().hex[:10]}",
        access_token_encrypted="enc::gAAAAABt-ciphertext-token",
        facebook_name="Test FB User",
        token_expires_at=expires_at,
        scopes=["pages_manage_posts", "pages_read_engagement", "business_management"],
    )

    repo = SqlAlchemyFacebookAccountRepository(db_session)
    created = await repo.create(account)

    fetched_by_id = await repo.get_by_id(created.id)
    assert fetched_by_id is not None
    assert fetched_by_id.seller_user_id == seller_id
    assert fetched_by_id.access_token_encrypted == "enc::gAAAAABt-ciphertext-token"
    # Scopes must round-trip as a list, not a JSON string or empty list.
    assert fetched_by_id.scopes == [
        "pages_manage_posts",
        "pages_read_engagement",
        "business_management",
    ]
    assert fetched_by_id.status == FacebookAccountStatus.ACTIVE

    # get_by_facebook_user_id is the OAuth callback lookup path.
    fetched_by_fb = await repo.get_by_facebook_user_id(account.facebook_user_id)
    assert fetched_by_fb is not None
    assert fetched_by_fb.id == created.id

    # get_by_seller_user_id powers the "my connected accounts" UI.
    by_seller = await repo.get_by_seller_user_id(seller_id)
    assert any(a.id == created.id for a in by_seller)
