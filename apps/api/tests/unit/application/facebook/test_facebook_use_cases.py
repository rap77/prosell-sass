"""Unit tests for Facebook Marketplace use cases."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.dto.facebook import (
    AuthorizeFacebookAccountRequest,
    DisconnectFacebookAccountRequest,
    FacebookOAuthCallbackRequest,
)
from prosell.application.use_cases.facebook.authorize_account import (
    AuthorizeFacebookAccountUseCase,
)
from prosell.application.use_cases.facebook.disconnect_account import (
    DisconnectFacebookAccountUseCase,
)
from prosell.application.use_cases.facebook.fetch_pages import FetchPagesUseCase
from prosell.application.use_cases.facebook.list_accounts import ListAccountsUseCase
from prosell.application.use_cases.facebook.oauth_callback import OAuthCallbackUseCase
from prosell.application.use_cases.facebook.refresh_token import RefreshTokenUseCase
from prosell.application.use_cases.facebook.set_default_page import SetDefaultPageUseCase
from prosell.domain.entities.facebook_account import (
    FacebookAccount,
    FacebookAccountStatus,
)
from prosell.domain.entities.facebook_page import FacebookPage
from prosell.domain.exceptions.facebook_exceptions import (
    FacebookAccountNotFoundException,
    FacebookNotConfiguredException,
    FacebookStateException,
)

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def seller_user_id() -> str:
    """Return a test seller user ID."""
    return str(uuid4())


@pytest.fixture
def facebook_account() -> FacebookAccount:
    """Return a test Facebook account."""
    return FacebookAccount(
        id=str(uuid4()),
        seller_user_id=str(uuid4()),
        facebook_user_id="123456789",
        access_token_encrypted="encrypted_token",
        token_expires_at=None,
        status=FacebookAccountStatus.ACTIVE,
        scopes=["pages_manage_posts"],
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
def facebook_page() -> FacebookPage:
    """Return a test Facebook page."""
    return FacebookPage(
        id=str(uuid4()),
        facebook_account_id=str(uuid4()),
        page_id="987654321",
        page_name="Test Dealership",
        page_access_token_encrypted="encrypted_page_token",
        category="Automotive Dealer",
        is_default=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def make_facebook_service() -> MagicMock:
    """Create mock Facebook OAuth service."""
    from dataclasses import dataclass

    @dataclass
    class TokenResult:
        access_token: str
        expires_in: int

    @dataclass
    class LongLivedTokenResult:
        access_token: str
        expires_at: datetime
        scopes: list[str] | None = None

    @dataclass
    class UserInfo:
        facebook_user_id: str
        name: str

    @dataclass
    class PageInfo:
        page_id: str
        page_name: str
        access_token: str
        category: str
        picture_url: str | None = None

    service = MagicMock()
    service.get_authorization_url = AsyncMock(return_value="https://facebook.com/oauth")
    service.exchange_code_for_token = AsyncMock(
        return_value=TokenResult(access_token="test_token", expires_in=5184000)
    )
    service.exchange_for_long_lived_token = AsyncMock(
        return_value=LongLivedTokenResult(
            access_token="long_lived_token",
            expires_at=datetime.now(UTC),
        )
    )
    service.get_user_info = AsyncMock(
        return_value=UserInfo(facebook_user_id="123456789", name="Test User")
    )
    service.get_user_pages = AsyncMock(
        return_value=[
            PageInfo(
                page_id="987654321",
                page_name="Test Dealership",
                access_token="page_token",
                category="Automotive Dealer",
            )
        ]
    )
    return service


def make_redis_service() -> MagicMock:
    """Create mock Redis service."""
    redis = MagicMock()
    redis.set = AsyncMock()
    redis.get = AsyncMock(return_value=str(uuid4()))
    redis.delete = AsyncMock()
    return redis


def make_facebook_account_repo() -> MagicMock:
    """Create mock Facebook account repository."""
    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=None)
    repo.get_by_seller_user_id = AsyncMock(return_value=[])
    repo.get_by_facebook_user_id = AsyncMock(return_value=None)
    repo.create = AsyncMock()
    repo.update = AsyncMock()
    repo.delete = AsyncMock()
    repo.get_accounts_expiring_before = AsyncMock(return_value=[])
    return repo


def make_facebook_page_repo() -> MagicMock:
    """Create mock Facebook page repository."""
    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=None)
    repo.get_by_facebook_account_id = AsyncMock(return_value=[])
    repo.create = AsyncMock()
    repo.update = AsyncMock()
    repo.delete_by_facebook_account_id = AsyncMock(return_value=0)
    repo.get_default_page = AsyncMock(return_value=None)
    repo.set_default_page = AsyncMock()
    return repo


def make_encryption_service() -> MagicMock:
    """Create mock encryption service."""

    enc = MagicMock()
    enc.encrypt = MagicMock(return_value="encrypted_token")
    enc.decrypt = MagicMock(return_value="plain_token")
    return enc


# =============================================================================
# AuthorizeFacebookAccountUseCase Tests
# =============================================================================


class TestAuthorizeFacebookAccountUseCase:
    """Tests for AuthorizeFacebookAccountUseCase."""

    async def test_authorize_success(self, seller_user_id: str) -> None:
        """Successful authorization generates state token and URL."""
        facebook_service = make_facebook_service()
        redis = make_redis_service()

        use_case = AuthorizeFacebookAccountUseCase(facebook_service, redis)

        request = AuthorizeFacebookAccountRequest(seller_user_id=seller_user_id)
        response = await use_case.execute(request)

        assert response.authorization_url == "https://facebook.com/oauth"
        assert response.state_token is not None
        assert len(response.state_token) > 0

        # Verify state token was stored in Redis
        redis.set.assert_awaited_once()
        call_args = redis.set.call_args
        assert "oauth:facebook:state:" in call_args[0][0]
        assert call_args[1]["ex"] == 600  # 10 minutes

    async def test_authorize_not_configured(self, seller_user_id: str) -> None:
        """Raises FacebookNotConfiguredException when credentials missing."""
        facebook_service = make_facebook_service()
        facebook_service.get_authorization_url = AsyncMock(
            side_effect=Exception("Facebook not configured")
        )
        redis = make_redis_service()

        use_case = AuthorizeFacebookAccountUseCase(facebook_service, redis)

        request = AuthorizeFacebookAccountRequest(seller_user_id=seller_user_id)

        with pytest.raises(FacebookNotConfiguredException):
            await use_case.execute(request)


# =============================================================================
# OAuthCallbackUseCase Tests
# =============================================================================


class TestOAuthCallbackUseCase:
    """Tests for OAuthCallbackUseCase."""

    async def test_callback_success(
        self, facebook_account: FacebookAccount, facebook_page: FacebookPage
    ) -> None:
        """Successful callback creates account and pages."""
        facebook_service = make_facebook_service()
        redis = make_redis_service()
        account_repo = make_facebook_account_repo()
        page_repo = make_facebook_page_repo()
        encryption = make_encryption_service()

        account_repo.create.return_value = facebook_account
        page_repo.create.return_value = facebook_page

        use_case = OAuthCallbackUseCase(
            facebook_service, account_repo, page_repo, encryption, redis
        )

        request = FacebookOAuthCallbackRequest(code="test_code", state="test_state")
        response = await use_case.execute(request)

        assert response.account_id == facebook_account.id
        assert response.facebook_user_id == "123456789"
        assert response.pages_count == 1

        # Verify state was deleted
        redis.delete.assert_awaited_once()

    async def test_callback_invalid_state(self) -> None:
        """Raises FacebookStateException when state token is invalid."""
        facebook_service = make_facebook_service()
        redis = make_redis_service()
        redis.get.return_value = None  # Invalid state
        account_repo = make_facebook_account_repo()
        page_repo = make_facebook_page_repo()
        encryption = make_encryption_service()

        use_case = OAuthCallbackUseCase(
            facebook_service, account_repo, page_repo, encryption, redis
        )

        request = FacebookOAuthCallbackRequest(code="test_code", state="invalid_state")

        with pytest.raises(FacebookStateException):
            await use_case.execute(request)


# =============================================================================
# ListAccountsUseCase Tests
# =============================================================================


class TestListAccountsUseCase:
    """Tests for ListAccountsUseCase."""

    async def test_list_accounts_success(
        self, seller_user_id: str, facebook_account: FacebookAccount
    ) -> None:
        """Successfully list user's Facebook accounts."""
        account_repo = make_facebook_account_repo()
        account_repo.get_by_seller_user_id.return_value = [facebook_account]

        use_case = ListAccountsUseCase(account_repo)

        accounts = await use_case.execute(seller_user_id)

        assert len(accounts) == 1
        assert accounts[0].id == facebook_account.id
        assert accounts[0].facebook_user_id == "123456789"

    async def test_list_accounts_empty(self, seller_user_id: str) -> None:
        """Returns empty list when user has no accounts."""
        account_repo = make_facebook_account_repo()
        account_repo.get_by_seller_user_id.return_value = []

        use_case = ListAccountsUseCase(account_repo)

        accounts = await use_case.execute(seller_user_id)

        assert len(accounts) == 0


# =============================================================================
# FetchPagesUseCase Tests
# =============================================================================


class TestFetchPagesUseCase:
    """Tests for FetchPagesUseCase."""

    async def test_fetch_pages_success(self, facebook_account: FacebookAccount) -> None:
        """Successfully fetch pages for account owned by user."""
        account_repo = make_facebook_account_repo()
        account_repo.get_by_id.return_value = facebook_account

        page_repo = make_facebook_page_repo()
        page = FacebookPage(
            id=str(uuid4()),
            facebook_account_id=facebook_account.id,
            page_id="987654321",
            page_name="Test Dealership",
            page_access_token_encrypted="encrypted_page_token",
            category="Automotive Dealer",
            is_default=False,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        page_repo.get_by_facebook_account_id.return_value = [page]

        use_case = FetchPagesUseCase(page_repo, account_repo)

        pages = await use_case.execute(facebook_account.id, facebook_account.seller_user_id)

        assert len(pages) == 1
        assert pages[0].page_id == "987654321"
        assert pages[0].page_name == "Test Dealership"

    async def test_fetch_pages_empty(self, facebook_account: FacebookAccount) -> None:
        """Returns empty list when account has no pages."""
        account_repo = make_facebook_account_repo()
        account_repo.get_by_id.return_value = facebook_account

        page_repo = make_facebook_page_repo()
        page_repo.get_by_facebook_account_id.return_value = []

        use_case = FetchPagesUseCase(page_repo, account_repo)

        pages = await use_case.execute(facebook_account.id, facebook_account.seller_user_id)

        assert len(pages) == 0

    async def test_fetch_pages_wrong_owner_raises(self, facebook_account: FacebookAccount) -> None:
        """Raises not found when user does not own the account."""
        account_repo = make_facebook_account_repo()
        account_repo.get_by_id.return_value = facebook_account

        page_repo = make_facebook_page_repo()
        use_case = FetchPagesUseCase(page_repo, account_repo)

        with pytest.raises(FacebookAccountNotFoundException):
            await use_case.execute(facebook_account.id, str(uuid4()))

    async def test_fetch_pages_account_not_found_raises(self) -> None:
        """Raises not found when account does not exist."""
        account_repo = make_facebook_account_repo()
        account_repo.get_by_id.return_value = None

        page_repo = make_facebook_page_repo()
        use_case = FetchPagesUseCase(page_repo, account_repo)

        with pytest.raises(FacebookAccountNotFoundException):
            await use_case.execute(str(uuid4()), str(uuid4()))


# =============================================================================
# SetDefaultPageUseCase Tests
# =============================================================================


class TestSetDefaultPageUseCase:
    """Tests for SetDefaultPageUseCase."""

    async def test_set_default_success(
        self, facebook_page: FacebookPage, facebook_account: FacebookAccount
    ) -> None:
        """Successfully set default page."""
        page_repo = make_facebook_page_repo()
        account_repo = make_facebook_account_repo()

        # Mock account exists
        account_repo.get_by_id.return_value = facebook_account

        use_case = SetDefaultPageUseCase(page_repo, account_repo)

        await use_case.execute(
            account_id=facebook_account.id,
            page_id=facebook_page.id,
            seller_user_id=facebook_account.seller_user_id,
        )

        # Verify default was set
        page_repo.set_default_page.assert_awaited_once_with(
            facebook_account_id=facebook_account.id,
            page_id=facebook_page.id,
        )

    async def test_set_default_page_not_found(self, facebook_account: FacebookAccount) -> None:
        """Raises FacebookAccountNotFoundException when account doesn't exist."""
        page_repo = make_facebook_page_repo()
        account_repo = make_facebook_account_repo()
        account_repo.get_by_id.return_value = None

        use_case = SetDefaultPageUseCase(page_repo, account_repo)

        with pytest.raises(FacebookAccountNotFoundException):
            await use_case.execute(
                account_id=facebook_account.id,
                page_id=str(uuid4()),
                seller_user_id=facebook_account.seller_user_id,
            )


# =============================================================================
# DisconnectFacebookAccountUseCase Tests
# =============================================================================


class TestDisconnectFacebookAccountUseCase:
    """Tests for DisconnectFacebookAccountUseCase."""

    async def test_disconnect_success(self, facebook_account: FacebookAccount) -> None:
        """Successfully disconnect account and delete pages."""
        account_repo = make_facebook_account_repo()
        page_repo = make_facebook_page_repo()

        account_repo.get_by_id.return_value = facebook_account
        page_repo.delete_by_facebook_account_id.return_value = 2  # 2 pages deleted

        use_case = DisconnectFacebookAccountUseCase(account_repo, page_repo)

        request = DisconnectFacebookAccountRequest(
            account_id=facebook_account.id,
            seller_user_id=facebook_account.seller_user_id,
        )

        response = await use_case.execute(request)

        assert response.account_id == facebook_account.id
        assert response.pages_deleted == 2

        # Verify account and pages were deleted
        page_repo.delete_by_facebook_account_id.assert_awaited_once_with(
            facebook_account_id=facebook_account.id
        )
        account_repo.delete.assert_awaited_once_with(facebook_account.id)

    async def test_disconnect_account_not_found(self) -> None:
        """Raises FacebookAccountNotFoundException when account doesn't exist."""
        account_repo = make_facebook_account_repo()
        account_repo.get_by_id.return_value = None
        page_repo = make_facebook_page_repo()

        use_case = DisconnectFacebookAccountUseCase(account_repo, page_repo)

        account_id = str(uuid4())
        request = DisconnectFacebookAccountRequest(
            account_id=account_id,
            seller_user_id=str(uuid4()),
        )

        with pytest.raises(FacebookAccountNotFoundException):
            await use_case.execute(request)


# =============================================================================
# RefreshTokenUseCase Tests
# =============================================================================


class TestRefreshTokenUseCase:
    """Tests for RefreshTokenUseCase."""

    async def test_refresh_success(self, facebook_account: FacebookAccount) -> None:
        """Successfully refresh expiring tokens."""
        facebook_service = make_facebook_service()
        account_repo = make_facebook_account_repo()
        encryption = make_encryption_service()

        account_repo.get_accounts_expiring_before.return_value = [facebook_account]

        use_case = RefreshTokenUseCase(
            account_repository=account_repo,
            facebook_service=facebook_service,
            encryption_service=encryption,
        )

        result = await use_case.execute(hours_before=48)

        assert result["refreshed"] == 1
        assert result["failed"] == 0

        # Verify account was updated
        account_repo.update.assert_awaited_once()

    async def test_refresh_no_expiring_accounts(self) -> None:
        """Returns success when no accounts need refresh."""

        # Simple object without MagicMock wrapper
        class SimpleRepo:
            async def get_accounts_expiring_before(
                self,
                threshold: object,  # noqa: ARG002
            ) -> list[FacebookAccount]:
                return []

            async def update(self, account: FacebookAccount) -> None:
                pass

        account_repo = SimpleRepo()
        print(f"Created account_repo: {type(account_repo)}, id={id(account_repo)}")

        facebook_service = make_facebook_service()
        encryption = make_encryption_service()

        # Direct instantiation with correct parameter order
        use_case = RefreshTokenUseCase(
            account_repository=account_repo,
            facebook_service=facebook_service,
            encryption_service=encryption,
        )

        print(f"Created use_case: {type(use_case.account_repository)}")

        result = await use_case.execute(hours_before=48)

        assert result["refreshed"] == 0
        assert result["failed"] == 0
