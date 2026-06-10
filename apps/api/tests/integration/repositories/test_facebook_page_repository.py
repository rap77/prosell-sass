"""Regression: a Facebook page persisted through the real
``FacebookPage.create()`` factory round-trips, the parent
``facebook_account_id`` is enforced, and ``set_default_page`` flips the
``is_default`` flag atomically (only one page per account is the default
at any time).

The product path that publishes to Marketplace reads
``get_default_page(account_id)`` to pick the page that posts listings.
If ``set_default_page`` doesn't unset the previous default first, a
seller with 3 pages could end up with 2-3 "default" pages and the
publishing flow would have to guess — or worse, post to a page the
seller revoked.
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.facebook_account import FacebookAccount
from prosell.domain.entities.facebook_page import FacebookPage
from prosell.infrastructure.repositories.facebook_account_repository_impl import (
    SqlAlchemyFacebookAccountRepository,
)
from prosell.infrastructure.repositories.facebook_page_repository_impl import (
    SqlAlchemyFacebookPageRepository,
)


@pytest.mark.asyncio
async def test_create_page_and_set_default_swaps_exclusively(
    db_session,
    test_user,
) -> None:
    """Page round-trips; set_default_page atomically unsets the previous default."""
    # First create the parent account (FK target).
    account_repo = SqlAlchemyFacebookAccountRepository(db_session)
    account = await account_repo.create(
        FacebookAccount.create(
            seller_user_id=test_user.id,
            facebook_user_id=f"fb-{uuid4().hex[:10]}",
            access_token_encrypted="enc::parent-account-token",
        )
    )

    page_repo = SqlAlchemyFacebookPageRepository(db_session)
    page_a = await page_repo.create(
        FacebookPage.create(
            facebook_account_id=account.id,
            page_id=f"page-a-{uuid4().hex[:8]}",
            page_name="Page A",
            page_access_token_encrypted="enc::page-a-token",
            is_default=True,
        )
    )
    page_b = await page_repo.create(
        FacebookPage.create(
            facebook_account_id=account.id,
            page_id=f"page-b-{uuid4().hex[:8]}",
            page_name="Page B",
            page_access_token_encrypted="enc::page-b-token",
            is_default=False,
        )
    )

    # Sanity: page A is the only default initially.
    initial_default = await page_repo.get_default_page(account.id)
    assert initial_default is not None
    assert initial_default.id == page_a.id

    # Swap default to page B; A must lose its default flag.
    await page_repo.set_default_page(account.id, page_b.id)

    new_default = await page_repo.get_default_page(account.id)
    assert new_default is not None
    assert new_default.id == page_b.id

    # Both pages still exist, but only one is default.
    all_pages = await page_repo.get_by_facebook_account_id(account.id)
    defaults = [p for p in all_pages if p.is_default]
    assert len(defaults) == 1
    assert defaults[0].id == page_b.id
