"""Unit tests for OAuth service.

Tests the OAuthServiceImpl class which handles OAuth 2.0 authorization code flow.
Tests use mocking for external HTTP calls to OAuth providers.
"""

from dataclasses import FrozenInstanceError
from datetime import UTC, datetime, timedelta
from typing import cast

import pytest

from prosell.core.config import OAuthSettings
from prosell.domain.ports.i_oauth_service import IOAuthService
from prosell.infrastructure.services.oauth_service_impl import OAuthServiceImpl

# =============================================================================
# FAKE REDIS FOR UNIT TESTS
# =============================================================================


class FakeRedis:
    """In-memory fake Redis for unit tests (async).

    Mimics the async Redis operations used by OAuthServiceImpl:
    - setex(key, ttl, value) - set with expiration
    - exists(key) - check if key exists
    - delete(key) - remove key

    Also provides test introspection methods:
    - contains_state(state_token) - check if state token exists (with prefix)
    - expire_state(state_token) - manually expire a state token
    """

    def __init__(self):
        self._data: dict[str, str] = {}
        self._expiry: dict[str, float] = {}  # key -> unix timestamp

    async def setex(self, key: str, ttl_seconds: int, value: str) -> None:
        """Set key with expiration in seconds."""
        self._data[key] = value
        import time

        self._expiry[key] = time.time() + ttl_seconds

    async def exists(self, key: str) -> int:
        """Check if key exists and not expired. Returns 1 or 0."""
        import time

        if key not in self._data:
            return 0
        # Check expiration
        if self._expiry.get(key, float("inf")) < time.time():
            # Expired, remove it
            self._data.pop(key, None)
            self._expiry.pop(key, None)
            return 0
        return 1

    async def delete(self, *keys: str) -> int:
        """Delete keys. Returns number of keys deleted."""
        count = 0
        for key in keys:
            if key in self._data:
                self._data.pop(key)
                self._expiry.pop(key, None)
                count += 1
        return count

    # Test introspection methods (not part of real Redis API)
    # These handle the oauth:state: prefix automatically

    def contains_state(self, state_token: str) -> bool:
        """Check if state token exists in data (ignoring expiration)."""
        key = f"oauth:state:{state_token}"
        return key in self._data

    def expire_state(self, state_token: str) -> None:
        """Manually expire a state token (for testing)."""
        key = f"oauth:state:{state_token}"
        import time

        self._expiry[key] = time.time() - 1  # Set expiry to past


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def oauth_settings() -> OAuthSettings:
    """Fixture for OAuth settings."""
    return OAuthSettings(
        # Google OAuth
        google_oauth_client_id="test-google-client-id",
        google_oauth_client_secret="test-google-secret",
        google_oauth_redirect_uri="http://localhost:8000/api/v1/auth/oauth/google/callback",
        # Facebook OAuth (corrected field names)
        facebook_oauth_app_id="test-facebook-app-id",
        facebook_oauth_app_secret="test-facebook-secret",
        facebook_oauth_redirect_uri="http://localhost:8000/api/v1/auth/oauth/facebook/callback",
        # Redis URL for state token storage
        redis_url="redis://localhost:6379/0",
        # Frontend URLs
        frontend_success_url="http://localhost:3000/dashboard",
        frontend_failure_url="http://localhost:3000/auth/login?error=",
        # State token expiration
        state_token_expire_minutes=10,
    )


@pytest.fixture
def oauth_service(oauth_settings: OAuthSettings) -> OAuthServiceImpl:
    """Fixture for OAuth service with FakeRedis injected."""
    service = OAuthServiceImpl(settings=oauth_settings)
    # Inject FakeRedis to avoid needing real Redis in unit tests
    object.__setattr__(service, "_redis", FakeRedis())  # type: ignore[arg-type]
    return service


# =============================================================================
# TEST CLASS: INITIATE AUTHORIZATION
# =============================================================================


class TestOAuthServiceInitiate:
    """Tests for OAuth authorization initiation."""

    @pytest.mark.asyncio
    async def test_initiate_google_authorization_generates_valid_url(
        self, oauth_service: IOAuthService
    ) -> None:
        """Test that Google authorization URL is correctly formatted."""
        result = await oauth_service.initiate_authorization(
            provider="google",
            redirect_uri="http://localhost:8000/api/v1/auth/oauth/google/callback",
        )

        # Verify authorization URL structure
        assert result.authorization_url.startswith("https://accounts.google.com/o/oauth2/v2/auth")
        assert "client_id=test-google-client-id" in result.authorization_url
        assert "response_type=code" in result.authorization_url
        assert "scope=openid" in result.authorization_url
        assert "state=" in result.authorization_url

        # Verify state token was generated
        assert result.state_token is not None
        assert len(result.state_token) > 0
        assert "-" in result.state_token  # UUID format

    @pytest.mark.asyncio
    async def test_initiate_google_authorization_stores_state_token(
        self, oauth_service: IOAuthService
    ) -> None:
        """Test that state token is stored after Google authorization initiation."""
        result = await oauth_service.initiate_authorization(
            provider="google",
            redirect_uri="http://localhost:8000/api/v1/auth/oauth/google/callback",
        )

        # Verify state token is stored in Redis
        service_impl: OAuthServiceImpl = cast(OAuthServiceImpl, oauth_service)  # type: ignore[reportPrivateUsage]
        assert service_impl._redis.contains_state(result.state_token)  # type: ignore[reportPrivateUsage]

        # Verify token exists (not expired)
        assert await oauth_service.validate_state(result.state_token) is True

    @pytest.mark.asyncio
    async def test_initiate_facebook_authorization_generates_valid_url(
        self, oauth_service: IOAuthService
    ) -> None:
        """Test that Facebook authorization URL is correctly formatted."""
        result = await oauth_service.initiate_authorization(
            provider="facebook",
            redirect_uri="http://localhost:8000/api/v1/auth/oauth/facebook/callback",
        )

        # Verify authorization URL structure
        assert result.authorization_url.startswith("https://www.facebook.com/v18.0/dialog/oauth")
        assert "client_id=test-facebook-app-id" in result.authorization_url
        assert "response_type=code" in result.authorization_url
        assert "scope=email" in result.authorization_url
        assert "state=" in result.authorization_url

        # Verify state token was generated
        assert result.state_token is not None
        assert len(result.state_token) > 0

    @pytest.mark.asyncio
    async def test_initiate_authorization_unsupported_provider_raises_error(
        self, oauth_service: IOAuthService
    ) -> None:
        """Test that unsupported provider raises OAuthProviderNotSupportedError."""
        from prosell.domain.exceptions.auth_exceptions import OAuthProviderNotSupportedError

        with pytest.raises(OAuthProviderNotSupportedError) as exc_info:
            await oauth_service.initiate_authorization(
                provider="unsupported",
                redirect_uri="http://localhost:8000/callback",
            )

        assert "unsupported" in exc_info.value.message.lower()
        assert exc_info.value.details["provider"] == "unsupported"

    @pytest.mark.asyncio
    async def test_initiate_authorization_case_insensitive_provider(
        self, oauth_service: IOAuthService
    ) -> None:
        """Test that provider name is case-insensitive."""
        result1 = await oauth_service.initiate_authorization(
            provider="Google",
            redirect_uri="http://localhost:8000/callback",
        )
        result2 = await oauth_service.initiate_authorization(
            provider="GOOGLE",
            redirect_uri="http://localhost:8000/callback",
        )

        # Both should generate valid URLs
        assert "accounts.google.com" in result1.authorization_url
        assert "accounts.google.com" in result2.authorization_url


# =============================================================================
# TEST CLASS: STATE TOKEN VALIDATION
# =============================================================================


class TestOAuthServiceState:
    """Tests for state token validation."""

    @pytest.mark.asyncio
    async def test_valid_state_passes_validation(self, oauth_service: IOAuthService) -> None:
        """Test that valid state token passes validation."""
        # Initiate to create state token
        result = await oauth_service.initiate_authorization(
            "google", "http://localhost:8000/callback"
        )

        # Validate should succeed
        is_valid = await oauth_service.validate_state(result.state_token)
        assert is_valid is True

    @pytest.mark.asyncio
    async def test_invalid_state_fails_validation(self, oauth_service: IOAuthService) -> None:
        """Test that invalid state token fails validation."""
        is_valid = await oauth_service.validate_state("non-existent-state")
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_expired_state_fails_validation(self, oauth_service: IOAuthService) -> None:
        """Test that expired state token fails validation."""
        # Initiate to create state token
        result = await oauth_service.initiate_authorization(
            "google", "http://localhost:8000/callback"
        )

        # Manually expire the state token in Redis
        service_impl: OAuthServiceImpl = cast(OAuthServiceImpl, oauth_service)  # type: ignore[reportPrivateUsage]
        service_impl._redis.expire_state(result.state_token)  # type: ignore[reportPrivateUsage]

        # Validate should fail
        is_valid = await oauth_service.validate_state(result.state_token)
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_consume_state_removes_token(self, oauth_service: IOAuthService) -> None:
        """Test that consume_state removes state token."""
        # Initiate to create state token
        result = await oauth_service.initiate_authorization(
            "google", "http://localhost:8000/callback"
        )

        # Verify token exists
        service_impl: OAuthServiceImpl = cast(OAuthServiceImpl, oauth_service)  # type: ignore[reportPrivateUsage]
        assert service_impl._redis.contains_state(result.state_token)  # type: ignore[reportPrivateUsage]

        # Consume state token
        await oauth_service.consume_state(result.state_token)

        # Token should be removed
        service_impl: OAuthServiceImpl = cast(OAuthServiceImpl, oauth_service)  # type: ignore[reportPrivateUsage]
        assert not service_impl._redis.contains_state(result.state_token)  # type: ignore[reportPrivateUsage]

    @pytest.mark.asyncio
    async def test_consume_nonexistent_state_is_safe(self, oauth_service: IOAuthService) -> None:
        """Test that consuming non-existent state doesn't raise error."""
        # Should not raise any exception
        await oauth_service.consume_state("non-existent-state")

    @pytest.mark.asyncio
    async def test_state_is_single_use(self, oauth_service: IOAuthService) -> None:
        """Test that state token validation works only once."""
        # Initiate to create state token
        result = await oauth_service.initiate_authorization(
            "google", "http://localhost:8000/callback"
        )

        # First validation should succeed
        is_valid = await oauth_service.validate_state(result.state_token)
        assert is_valid is True

        # Consume state token (simulating successful callback)
        await oauth_service.consume_state(result.state_token)

        # Second validation should fail (token consumed)
        is_valid = await oauth_service.validate_state(result.state_token)
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_multiple_state_tokens_coexist(self, oauth_service: IOAuthService) -> None:
        """Test that multiple state tokens can coexist."""
        result1 = await oauth_service.initiate_authorization(
            "google", "http://localhost:8000/callback"
        )
        result2 = await oauth_service.initiate_authorization(
            "facebook", "http://localhost:8000/callback"
        )

        # Both tokens should exist
        assert cast(OAuthServiceImpl, oauth_service)._redis.contains_state(result1.state_token)  # type: ignore[reportPrivateUsage]
        assert cast(OAuthServiceImpl, oauth_service)._redis.contains_state(result2.state_token)  # type: ignore[reportPrivateUsage]

        # Both should be valid
        assert await oauth_service.validate_state(result1.state_token) is True
        assert await oauth_service.validate_state(result2.state_token) is True

        # Tokens should be different
        assert result1.state_token != result2.state_token


# =============================================================================
# TEST CLASS: CONFIGURATION
# =============================================================================


class TestOAuthServiceConfiguration:
    """Tests for OAuth service configuration."""

    def test_oauth_service_uses_settings(self, oauth_settings: OAuthSettings) -> None:
        """Test that OAuth service is initialized with settings."""
        service = OAuthServiceImpl(settings=oauth_settings)

        # Settings should be stored
        assert service.settings == oauth_settings

    def test_state_token_expire_minutes_default(self, oauth_settings: OAuthSettings) -> None:
        """Test that state token expiration defaults to 10 minutes."""
        assert oauth_settings.state_token_expire_minutes == 10

    async def test_google_credentials_required_for_authorization(
        self, oauth_settings: OAuthSettings
    ) -> None:
        """Test that Google credentials are required for authorization."""
        # Remove client ID
        oauth_settings.google_oauth_client_id = None
        service = OAuthServiceImpl(settings=oauth_settings)
        # Inject FakeRedis via private attribute (necessary for testing)
        object.__setattr__(service, "_redis", FakeRedis())  # type: ignore[arg-type]

        # Should raise OAuthConfigurationError when trying to initiate
        from prosell.domain.exceptions.auth_exceptions import OAuthConfigurationError

        with pytest.raises(OAuthConfigurationError) as exc_info:
            await service.initiate_authorization("google", "http://localhost:8000/callback")

        assert exc_info.value.details["provider"] == "Google"


# =============================================================================
# TEST CLASS: OAUTH USER INFO DTO
# =============================================================================


class TestOAuthUserInfo:
    """Tests for OAuthUserInfo dataclass."""

    def test_oauth_user_info_creation(self):
        """Test creating OAuthUserInfo with all fields."""
        from prosell.domain.ports.i_oauth_service import OAuthUserInfo

        user_info = OAuthUserInfo(
            provider_user_id="123456",
            email="user@example.com",
            full_name="Test User",
            avatar_url="https://example.com/avatar.jpg",
            access_token="access_token_value",
            refresh_token="refresh_token_value",
            expires_at=datetime.now(UTC) + timedelta(hours=1),
        )

        assert user_info.provider_user_id == "123456"
        assert user_info.email == "user@example.com"
        assert user_info.full_name == "Test User"
        assert user_info.avatar_url == "https://example.com/avatar.jpg"
        assert user_info.access_token == "access_token_value"
        assert user_info.refresh_token == "refresh_token_value"

    def test_oauth_user_info_optional_fields(self):
        """Test creating OAuthUserInfo with minimal fields."""
        from prosell.domain.ports.i_oauth_service import OAuthUserInfo

        user_info = OAuthUserInfo(
            provider_user_id="123456",
            email="user@example.com",
            full_name="Test User",
        )

        assert user_info.provider_user_id == "123456"
        assert user_info.avatar_url is None
        assert user_info.access_token is None
        assert user_info.refresh_token is None
        assert user_info.expires_at is None

    def test_oauth_user_info_is_frozen(self):
        """Test that OAuthUserInfo is immutable (frozen)."""
        from prosell.domain.ports.i_oauth_service import OAuthUserInfo

        user_info = OAuthUserInfo(
            provider_user_id="123456",
            email="user@example.com",
            full_name="Test User",
        )

        # Should raise FrozenInstanceError when trying to modify
        with pytest.raises(FrozenInstanceError):
            user_info.email = "newemail@example.com"  # type: ignore[misc]


# =============================================================================
# TEST CLASS: OAUTH AUTHORIZE RESULT DTO
# =============================================================================


class TestOAuthAuthorizeResult:
    """Tests for OAuthAuthorizeResult dataclass."""

    def test_oauth_authorize_result_creation(self):
        """Test creating OAuthAuthorizeResult."""
        from prosell.domain.ports.i_oauth_service import OAuthAuthorizeResult

        result = OAuthAuthorizeResult(
            authorization_url="https://accounts.google.com/o/oauth2/v2/auth?...",
            state_token="uuid-state-token",
        )

        assert result.authorization_url.startswith("https://accounts.google.com")
        assert result.state_token == "uuid-state-token"

    def test_oauth_authorize_result_is_frozen(self):
        """Test that OAuthAuthorizeResult is immutable."""
        from prosell.domain.ports.i_oauth_service import OAuthAuthorizeResult

        result = OAuthAuthorizeResult(
            authorization_url="https://example.com/auth",
            state_token="state-123",
        )

        # Should raise exception when trying to modify
        with pytest.raises(FrozenInstanceError):
            result.authorization_url = "https://modified.com"  # type: ignore[misc]


# =============================================================================
# TEST CLASS: OAUTH CALLBACK RESULT DTO
# =============================================================================


class TestOAuthCallbackResult:
    """Tests for OAuthCallbackResult dataclass."""

    def test_oauth_callback_result_creation(self):
        """Test creating OAuthCallbackResult."""
        from prosell.domain.ports.i_oauth_service import (
            OAuthCallbackResult,
            OAuthUserInfo,
        )

        user_info = OAuthUserInfo(
            provider_user_id="123456",
            email="user@example.com",
            full_name="Test User",
        )

        result = OAuthCallbackResult(
            user_info=user_info,
            provider="google",
        )

        assert result.user_info == user_info
        assert result.provider == "google"

    def test_oauth_callback_result_is_frozen(self):
        """Test that OAuthCallbackResult is immutable."""
        from prosell.domain.ports.i_oauth_service import (
            OAuthCallbackResult,
            OAuthUserInfo,
        )

        user_info = OAuthUserInfo(
            provider_user_id="123456",
            email="user@example.com",
            full_name="Test User",
        )

        result = OAuthCallbackResult(
            user_info=user_info,
            provider="google",
        )

        # Should raise exception when trying to modify
        with pytest.raises(FrozenInstanceError):
            result.provider = "facebook"  # type: ignore[misc]
