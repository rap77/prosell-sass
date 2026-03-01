"""Unit tests for OAuth service.

Tests the OAuthServiceImpl class which handles OAuth 2.0 authorization code flow.
Tests use mocking for external HTTP calls to OAuth providers.
"""

from dataclasses import FrozenInstanceError
from datetime import UTC, datetime, timedelta

import pytest

from prosell.core.config import OAuthSettings
from prosell.infrastructure.services.oauth_service_impl import OAuthServiceImpl

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def oauth_settings():
    """Fixture for OAuth settings."""
    return OAuthSettings(
        google_client_id="test-google-client-id",
        google_client_secret="test-google-secret",
        google_redirect_uri="http://localhost:8000/api/v1/auth/oauth/google/callback",
        facebook_app_id="test-facebook-app-id",
        facebook_app_secret="test-facebook-secret",
        facebook_redirect_uri="http://localhost:8000/api/v1/auth/oauth/facebook/callback",
        frontend_success_url="http://localhost:3000/dashboard",
        frontend_failure_url="http://localhost:3000/auth/login?error=",
        state_token_expire_minutes=10,
    )


@pytest.fixture
def oauth_service(oauth_settings):
    """Fixture for OAuth service."""
    return OAuthServiceImpl(settings=oauth_settings)


# =============================================================================
# TEST CLASS: INITIATE AUTHORIZATION
# =============================================================================


class TestOAuthServiceInitiate:
    """Tests for OAuth authorization initiation."""

    @pytest.mark.asyncio
    async def test_initiate_google_authorization_generates_valid_url(self, oauth_service):
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
    async def test_initiate_google_authorization_stores_state_token(self, oauth_service):
        """Test that state token is stored after Google authorization initiation."""
        result = await oauth_service.initiate_authorization(
            provider="google",
            redirect_uri="http://localhost:8000/api/v1/auth/oauth/google/callback",
        )

        # Verify state token is stored
        assert result.state_token in oauth_service._state_tokens

        # Verify expiration is in the future
        expiry = oauth_service._state_tokens[result.state_token]
        assert expiry > datetime.now(UTC)

        # Verify expiration is approximately 10 minutes from now
        expected_expiry = datetime.now(UTC) + timedelta(minutes=10)
        time_diff = abs((expiry - expected_expiry).total_seconds())
        assert time_diff < 5  # Allow 5 seconds tolerance

    @pytest.mark.asyncio
    async def test_initiate_facebook_authorization_generates_valid_url(self, oauth_service):
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
    async def test_initiate_authorization_unsupported_provider_raises_error(self, oauth_service):
        """Test that unsupported provider raises HTTPException."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await oauth_service.initiate_authorization(
                provider="unsupported",
                redirect_uri="http://localhost:8000/callback",
            )

        assert exc_info.value.status_code == 400
        assert "Unsupported OAuth provider" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_initiate_authorization_case_insensitive_provider(self, oauth_service):
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
    async def test_valid_state_passes_validation(self, oauth_service):
        """Test that valid state token passes validation."""
        # Initiate to create state token
        result = await oauth_service.initiate_authorization(
            "google", "http://localhost:8000/callback"
        )

        # Validate should succeed
        is_valid = await oauth_service.validate_state(result.state_token)
        assert is_valid is True

    @pytest.mark.asyncio
    async def test_invalid_state_fails_validation(self, oauth_service):
        """Test that invalid state token fails validation."""
        is_valid = await oauth_service.validate_state("non-existent-state")
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_expired_state_fails_validation(self, oauth_service):
        """Test that expired state token fails validation."""
        # Initiate to create state token
        result = await oauth_service.initiate_authorization(
            "google", "http://localhost:8000/callback"
        )

        # Manually expire the state token
        oauth_service._state_tokens[result.state_token] = datetime.now(UTC) - timedelta(minutes=1)

        # Validate should fail
        is_valid = await oauth_service.validate_state(result.state_token)
        assert is_valid is False

        # Expired token should be cleaned up
        assert result.state_token not in oauth_service._state_tokens

    @pytest.mark.asyncio
    async def test_consume_state_removes_token(self, oauth_service):
        """Test that consume_state removes state token."""
        # Initiate to create state token
        result = await oauth_service.initiate_authorization(
            "google", "http://localhost:8000/callback"
        )

        # Verify token exists
        assert result.state_token in oauth_service._state_tokens

        # Consume state token
        await oauth_service.consume_state(result.state_token)

        # Token should be removed
        assert result.state_token not in oauth_service._state_tokens

    @pytest.mark.asyncio
    async def test_consume_nonexistent_state_is_safe(self, oauth_service):
        """Test that consuming non-existent state doesn't raise error."""
        # Should not raise any exception
        await oauth_service.consume_state("non-existent-state")

    @pytest.mark.asyncio
    async def test_state_is_single_use(self, oauth_service):
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
    async def test_multiple_state_tokens_coexist(self, oauth_service):
        """Test that multiple state tokens can coexist."""
        result1 = await oauth_service.initiate_authorization(
            "google", "http://localhost:8000/callback"
        )
        result2 = await oauth_service.initiate_authorization(
            "facebook", "http://localhost:8000/callback"
        )

        # Both tokens should exist
        assert result1.state_token in oauth_service._state_tokens
        assert result2.state_token in oauth_service._state_tokens

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

    def test_oauth_service_uses_settings(self, oauth_settings):
        """Test that OAuth service is initialized with settings."""
        service = OAuthServiceImpl(settings=oauth_settings)

        # Settings should be stored
        assert service.settings == oauth_settings

    def test_state_token_expire_minutes_default(self, oauth_settings):
        """Test that state token expiration defaults to 10 minutes."""
        assert oauth_settings.state_token_expire_minutes == 10

    async def test_google_credentials_required_for_authorization(self, oauth_settings):
        """Test that Google credentials are required for authorization."""
        # Remove client ID
        oauth_settings.google_client_id = None
        service = OAuthServiceImpl(settings=oauth_settings)

        # Should raise HTTPException when trying to initiate
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await service.initiate_authorization("google", "http://localhost:8000/callback")

        assert "not configured" in exc_info.value.detail


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
            user_info.email = "newemail@example.com"


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
            result.authorization_url = "https://modified.com"


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
            result.provider = "facebook"
