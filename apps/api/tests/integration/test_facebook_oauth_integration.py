"""Integration tests for Facebook Marketplace OAuth flow.

These tests verify the OAuth endpoints through FastAPI using dependency overrides.
Facebook service and Redis are mocked to avoid external dependencies.
"""

from collections.abc import AsyncGenerator, Generator
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.facebook_account import (
    FacebookAccount,
    FacebookAccountStatus,
)
from prosell.domain.entities.facebook_page import FacebookPage
from prosell.domain.entities.user import User
from prosell.infrastructure.api.main import app

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def mock_redis_service() -> MagicMock:
    """Mock Redis service for state token storage."""
    redis = MagicMock()
    redis.set = AsyncMock()
    redis.get = AsyncMock(return_value=str(uuid4()))
    redis.delete = AsyncMock()
    return redis


@pytest.fixture
def mock_facebook_service() -> MagicMock:
    """Mock Facebook OAuth service."""
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
    service.get_authorization_url = AsyncMock(
        return_value="https://facebook.com/v18.0/dialog/oauth"
    )
    service.exchange_code_for_token = AsyncMock(
        return_value=TokenResult(access_token="test_token", expires_in=5184000)
    )
    service.exchange_for_long_lived_token = AsyncMock(
        return_value=LongLivedTokenResult(
            access_token="long_token",
            expires_at=datetime.now(UTC) + timedelta(days=60),
            scopes=["pages_manage_posts"],
        )
    )
    service.get_user_info = AsyncMock(
        return_value=UserInfo(facebook_user_id="987654321", name="Test User")
    )
    service.get_user_pages = AsyncMock(return_value=[])
    return service


@pytest.fixture
def mock_encryption_service() -> MagicMock:
    """Mock token encryption service."""
    encryption = MagicMock()
    encryption.encrypt = MagicMock(return_value="encrypted")
    encryption.decrypt = MagicMock(return_value="decrypted")
    return encryption


@pytest.fixture
def sample_account() -> FacebookAccount:
    """Sample Facebook account."""
    account_id = uuid4()
    return FacebookAccount(
        id=str(account_id),
        seller_user_id=str(uuid4()),
        facebook_user_id="987654321",
        access_token_encrypted="encrypted",
        token_expires_at=datetime.now(UTC) + timedelta(days=60),
        status=FacebookAccountStatus.ACTIVE,
        scopes=["pages_manage_posts"],
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
def sample_page() -> FacebookPage:
    """Sample Facebook page."""
    return FacebookPage(
        id=str(uuid4()),
        facebook_account_id=str(uuid4()),
        page_id="123456789",
        page_name="Test Page",
        page_access_token_encrypted="encrypted",
        category="Test",
        is_default=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
def mock_auth_user() -> User:
    """Mock authenticated user."""
    return User(
        id=uuid4(),
        email="test@example.com",
        full_name="Test User",
        tenant_id=uuid4(),
        is_active=True,
        email_verified=True,
    )


@pytest.fixture
def auto_mock_auth(mock_auth_user: User) -> Generator[None]:
    """Automatically mock auth."""
    from prosell.infrastructure.api.dependencies import get_current_auth_user

    app.dependency_overrides[get_current_auth_user] = lambda: mock_auth_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def test_client(auto_mock_auth: None) -> AsyncGenerator[AsyncClient]:  # noqa: ARG001
    """Create test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# =============================================================================
# TESTS: /authorize ENDPOINT
# =============================================================================


class TestAuthorizeEndpoint:
    """Tests for POST /facebook/authorize."""

    async def test_authorize_success(
        self,
        test_client: AsyncClient,
        mock_auth_user: User,
        mock_facebook_service: MagicMock,
        mock_redis_service: MagicMock,
    ) -> None:
        """Test successful authorization."""
        from prosell.infrastructure.api.dependencies import (
            get_facebook_oauth_service,
            get_redis_service,
        )

        app.dependency_overrides[get_redis_service] = lambda: mock_redis_service
        app.dependency_overrides[get_facebook_oauth_service] = lambda: mock_facebook_service

        response = await test_client.post(
            "/api/v1/facebook/authorize",
            json={"seller_user_id": str(mock_auth_user.id)},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "authorization_url" in data
        assert "state_token" in data

    async def test_authorize_wrong_user_forbidden(self, test_client: AsyncClient) -> None:
        """Test authorize with wrong user_id returns 403."""
        wrong_id = uuid4()
        response = await test_client.post(
            "/api/v1/facebook/authorize",
            json={"seller_user_id": str(wrong_id)},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


# =============================================================================
# TESTS: /callback ENDPOINT
# =============================================================================


class TestCallbackEndpoint:
    """Tests for GET /facebook/callback."""

    async def test_callback_success(
        self,
        test_client: AsyncClient,
        mock_facebook_service: MagicMock,
        mock_redis_service: MagicMock,
    ) -> None:
        """Test successful callback."""
        seller_id = str(uuid4())
        mock_redis_service.get = AsyncMock(return_value=seller_id)

        from prosell.infrastructure.api.dependencies import (
            get_facebook_oauth_service,
            get_redis_service,
        )

        app.dependency_overrides[get_redis_service] = lambda: mock_redis_service
        app.dependency_overrides[get_facebook_oauth_service] = lambda: mock_facebook_service

        response = await test_client.get(
            "/api/v1/facebook/callback",
            params={"code": "test_code", "state": "valid_state"},
            follow_redirects=False,
        )

        assert response.status_code == status.HTTP_302_FOUND

    async def test_callback_invalid_state(
        self, test_client: AsyncClient, mock_redis_service: MagicMock
    ) -> None:
        """Test callback with invalid state."""
        mock_redis_service.get = AsyncMock(return_value=None)

        from prosell.infrastructure.api.dependencies import get_redis_service

        app.dependency_overrides[get_redis_service] = lambda: mock_redis_service

        response = await test_client.get(
            "/api/v1/facebook/callback",
            params={"code": "test_code", "state": "invalid"},
            follow_redirects=False,
        )

        assert response.status_code == status.HTTP_302_FOUND


# =============================================================================
# TESTS: /accounts ENDPOINT
# =============================================================================


class TestAccountsEndpoint:
    """Tests for GET /facebook/accounts."""

    async def test_list_accounts(
        self,
        test_client: AsyncClient,
        mock_auth_user: User,
        sample_account: FacebookAccount,
    ) -> None:
        """Test listing accounts."""
        from unittest.mock import AsyncMock, MagicMock

        from prosell.infrastructure.api.dependencies import get_facebook_account_repository

        # Mock repository to return entity (not DTO)
        # Use the mock_auth_user.id for seller_user_id
        account = FacebookAccount(
            id=sample_account.id,
            seller_user_id=str(mock_auth_user.id),  # Must match current user
            facebook_user_id=sample_account.facebook_user_id,
            access_token_encrypted=sample_account.access_token_encrypted,
            token_expires_at=sample_account.token_expires_at,
            status=sample_account.status,
            scopes=sample_account.scopes,
            created_at=sample_account.created_at,
            updated_at=sample_account.updated_at,
        )

        mock_repo = MagicMock()
        mock_repo.get_by_seller_user_id = AsyncMock(return_value=[account])

        app.dependency_overrides[get_facebook_account_repository] = lambda: mock_repo

        response = await test_client.get("/api/v1/facebook/accounts")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "accounts" in data


# =============================================================================
# TESTS: /admin/refresh-tokens ENDPOINT
# =============================================================================


class TestRefreshTokensEndpoint:
    """Tests for POST /facebook/admin/refresh-tokens."""

    @pytest.fixture(autouse=True)
    def mock_admin_role(self) -> Generator[None]:
        """Mock role repository to grant SUPER_ADMIN role."""
        from prosell.domain.entities.role import RoleType
        from prosell.infrastructure.api.dependencies import get_role_repository

        mock_repo = MagicMock()
        mock_role = MagicMock()
        mock_role.role_type = RoleType.SUPER_ADMIN
        mock_repo.get_user_roles = AsyncMock(return_value=[mock_role])
        app.dependency_overrides[get_role_repository] = lambda: mock_repo
        yield
        app.dependency_overrides.pop(get_role_repository, None)

    async def test_refresh_tokens(self, test_client: AsyncClient) -> None:
        """Test refresh tokens endpoint."""
        from unittest.mock import AsyncMock, MagicMock

        from prosell.infrastructure.api.dependencies import (
            get_facebook_account_repository,
            get_facebook_encryption_service,
            get_facebook_oauth_service,
        )

        mock_repo = MagicMock()
        mock_repo.get_accounts_expiring_before = AsyncMock(return_value=[])
        mock_repo.update = AsyncMock()

        mock_fb = MagicMock()
        mock_enc = MagicMock()

        app.dependency_overrides[get_facebook_account_repository] = lambda: mock_repo
        app.dependency_overrides[get_facebook_oauth_service] = lambda: mock_fb
        app.dependency_overrides[get_facebook_encryption_service] = lambda: mock_enc

        response = await test_client.post("/api/v1/facebook/admin/refresh-tokens?hours_before=48")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total" in data
        assert "refreshed" in data
        assert "failed" in data

    async def test_refresh_tokens_invalid_hours(self, test_client: AsyncClient) -> None:
        """Test refresh tokens with invalid hours."""
        response = await test_client.post("/api/v1/facebook/admin/refresh-tokens?hours_before=200")

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
