"""Integration tests for OAuth authorize/callback endpoints."""

# ruff: noqa: ARG002 - override_oauth_dependencies is a pytest fixture, not directly used

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.domain.ports.i_oauth_service import (
    OAuthAuthorizeResult,
    OAuthCallbackResult,
    OAuthUserInfo,
)
from prosell.infrastructure.api.main import app

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def mock_oauth_service() -> MagicMock:
    """Mock OAuth service."""
    service = MagicMock()
    service.initiate_authorization = AsyncMock(
        return_value=OAuthAuthorizeResult(
            authorization_url="https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=http://localhost:8000/api/v1/auth/oauth/google/callback&response_type=code&scope=openid+email+profile&state=test-state-123",
            state_token="test-state-123",
        )
    )
    service.process_callback = AsyncMock(
        return_value=OAuthCallbackResult(
            user_info=OAuthUserInfo(
                provider_user_id="google-123",
                email="test@google.example.com",
                full_name="Test Google User",
                avatar_url="https://example.com/avatar.jpg",
                access_token="google-access-token",
                refresh_token="google-refresh-token",
                expires_at=datetime.now(UTC) + timedelta(hours=1),
            ),
            provider="google",
        )
    )
    service.validate_state = AsyncMock(return_value=True)
    return service


@pytest.fixture
def mock_oauth_use_case() -> MagicMock:
    """Mock OAuth login use case."""
    from prosell.application.dto.auth import UserInfo
    from prosell.application.use_cases.auth.oauth_login import OAuthLoginResponse

    user_id = uuid4()
    use_case = MagicMock()
    use_case.execute = AsyncMock(
        return_value=OAuthLoginResponse(
            access_token="jwt-access-token",
            refresh_token="jwt-refresh-token",
            user=UserInfo(
                id=str(user_id),
                email="test@google.example.com",
                full_name="Test Google User",
                avatar_url="https://example.com/avatar.jpg",
                roles=[],
                tenant_id=str(uuid4()),
            ),
        ),
    )
    return use_case


@pytest.fixture
def override_oauth_dependencies(
    mock_oauth_service: MagicMock, mock_oauth_use_case: MagicMock
) -> Iterator[None]:
    """Override OAuth dependencies for testing."""
    from prosell.infrastructure.api.dependencies import get_oauth_login_use_case, get_oauth_service

    app.dependency_overrides[get_oauth_service] = lambda: mock_oauth_service
    app.dependency_overrides[get_oauth_login_use_case] = lambda: mock_oauth_use_case

    yield

    # Clean up
    app.dependency_overrides.clear()


# =============================================================================
# TESTS: /authorize ENDPOINT
# =============================================================================


@pytest.mark.asyncio
class TestOAuthAuthorizeEndpoint:
    """Tests for GET /auth/oauth/{provider}/authorize."""

    async def test_google_authorize_redirects_to_google(self, override_oauth_dependencies) -> None:
        """Test that authorize endpoint redirects to Google OAuth."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/oauth/google/authorize",
                follow_redirects=False,
            )

            assert response.status_code == status.HTTP_302_FOUND
            assert response.headers["location"].startswith(
                "https://accounts.google.com/o/oauth2/v2/auth"
            )
            assert "client_id=" in response.headers["location"]
            assert "state=test-state-123" in response.headers["location"]

    async def test_facebook_authorize_redirects_to_facebook(
        self, override_oauth_dependencies
    ) -> None:
        """Test that authorize endpoint redirects to Facebook OAuth."""
        # Update mock to return Facebook URL
        from prosell.infrastructure.api.dependencies import get_oauth_service

        mock_service = app.dependency_overrides[get_oauth_service]()
        mock_service.initiate_authorization = AsyncMock(
            return_value=OAuthAuthorizeResult(
                authorization_url="https://www.facebook.com/v18.0/dialog/oauth?client_id=test&redirect_uri=http://localhost:8000/api/v1/auth/oauth/facebook/callback&response_type=code&scope=email%2Cpublic_profile&state=test-state-456",
                state_token="test-state-456",
            )
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/oauth/facebook/authorize",
                follow_redirects=False,
            )

            assert response.status_code == status.HTTP_302_FOUND
            assert response.headers["location"].startswith(
                "https://www.facebook.com/v18.0/dialog/oauth"
            )

    async def test_unsupported_provider_raises_exception(self, override_oauth_dependencies) -> None:
        """Test that unsupported provider raises exception."""
        from prosell.infrastructure.api.dependencies import get_oauth_service

        mock_service = app.dependency_overrides[get_oauth_service]()
        mock_service.initiate_authorization = AsyncMock(
            side_effect=Exception("Unsupported provider")
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Exception is raised - in production middleware would catch it
            with pytest.raises(Exception, match="Unsupported provider"):
                await client.get(
                    "/api/v1/auth/oauth/github/authorize",
                    follow_redirects=False,
                )


# =============================================================================
# TESTS: /callback ENDPOINT
# =============================================================================


@pytest.mark.asyncio
class TestOAuthCallbackEndpoint:
    """Tests for GET /auth/oauth/{provider}/callback."""

    async def test_successful_callback_sets_cookies_and_redirects(
        self, override_oauth_dependencies
    ) -> None:
        """Test that successful callback sets httpOnly cookies and redirects."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/oauth/google/callback",
                params={
                    "code": "valid-google-auth-code",
                    "state": "test-state-123",
                },
                follow_redirects=False,
            )

            # Should redirect to frontend success URL
            assert response.status_code == status.HTTP_302_FOUND
            assert "localhost:3000/dashboard" in response.headers["location"]

            # Should set httpOnly cookies.
            # When domain="localhost" and base_url="http://test", httpx rejects cookies
            # from response.cookies. Read raw Set-Cookie headers instead.
            set_cookie_headers = (
                response.headers.get_list("set-cookie")
                if hasattr(response.headers, "get_list")
                else [v for k, v in response.headers.items() if k.lower() == "set-cookie"]
            )
            cookie_names = [h.split("=")[0] for h in set_cookie_headers]
            assert "access_token" in cookie_names
            assert "refresh_token" in cookie_names
            assert "user_data" in cookie_names

    async def test_callback_with_error_redirects_to_login(
        self, override_oauth_dependencies
    ) -> None:
        """Test that callback with error parameter redirects to login with error."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/oauth/google/callback",
                params={
                    "code": "ignored-code",  # OAuth providers send this even on error
                    "state": "ignored-state",
                    "error": "access_denied",
                },
                follow_redirects=False,
            )

            assert response.status_code == status.HTTP_302_FOUND
            location = response.headers["location"]
            assert "localhost:3000/auth/login" in location
            assert "access_denied" in location

    async def test_callback_invalid_state_returns_error(self, override_oauth_dependencies) -> None:
        """Test that callback with invalid state returns error."""
        from prosell.infrastructure.api.dependencies import get_oauth_service

        # Mock validate_state to return False (invalid state)
        mock_service = app.dependency_overrides[get_oauth_service]()
        mock_service.validate_state = AsyncMock(return_value=False)
        mock_service.process_callback = AsyncMock(
            side_effect=Exception("Invalid or expired state token")
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/oauth/google/callback",
                params={
                    "code": "valid-code",
                    "state": "invalid-state",
                },
                follow_redirects=False,
            )

            # Should redirect to frontend with error
            assert response.status_code == status.HTTP_302_FOUND
            location = response.headers["location"]
            assert "localhost:3000/auth/login" in location

    async def test_callback_service_error_redirects_to_login(
        self, override_oauth_dependencies
    ) -> None:
        """Test that callback service error redirects to login."""
        from prosell.infrastructure.api.dependencies import get_oauth_service

        # Mock to raise exception
        mock_service = app.dependency_overrides[get_oauth_service]()
        mock_service.process_callback = AsyncMock(side_effect=Exception("OAuth service error"))

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/oauth/google/callback",
                params={
                    "code": "valid-code",
                    "state": "valid-state",
                },
                follow_redirects=False,
            )

            # Should redirect to frontend with error
            assert response.status_code == status.HTTP_302_FOUND
            location = response.headers["location"]
            assert "localhost:3000/auth/login" in location

    async def test_callback_missing_code_parameter_fails(self, override_oauth_dependencies) -> None:
        """Test that callback without code parameter fails gracefully with redirect."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/oauth/google/callback",
                params={
                    "state": "test-state-123",
                    # missing 'code'
                },
                follow_redirects=False,
            )

            # Should redirect to frontend with error
            assert response.status_code == status.HTTP_302_FOUND
            location = response.headers["location"]
            assert "localhost:3000/auth/login" in location
            assert "invalid_request" in location

    async def test_callback_missing_state_parameter_fails(
        self, override_oauth_dependencies
    ) -> None:
        """Test that callback without state parameter fails gracefully with redirect."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/auth/oauth/google/callback",
                params={
                    "code": "valid-code",
                    # missing 'state'
                },
                follow_redirects=False,
            )

            # Should redirect to frontend with error
            assert response.status_code == status.HTTP_302_FOUND
            location = response.headers["location"]
            assert "localhost:3000/auth/login" in location
            assert "invalid_request" in location


# =============================================================================
# TESTS: OAUTH SERVICE CALLS
# =============================================================================


@pytest.mark.asyncio
class TestOAuthServiceCalls:
    """Tests that OAuth service is called correctly."""

    async def test_authorize_calls_service_with_correct_redirect_uri(
        self, override_oauth_dependencies
    ) -> None:
        """Test that authorize endpoint calls service with correct redirect URI."""
        from prosell.infrastructure.api.dependencies import get_oauth_service

        mock_service = app.dependency_overrides[get_oauth_service]()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.get(
                "/api/v1/auth/oauth/google/authorize",
                follow_redirects=False,
            )

            # Verify service was called with correct redirect URI
            mock_service.initiate_authorization.assert_called_once()
            call_args = mock_service.initiate_authorization.call_args
            assert call_args[1]["provider"] == "google"
            assert (
                "localhost:8000/api/v1/auth/oauth/google/callback" in call_args[1]["redirect_uri"]
            )

    async def test_callback_calls_service_with_correct_parameters(
        self, override_oauth_dependencies
    ) -> None:
        """Test that callback endpoint calls service with correct parameters."""
        from prosell.infrastructure.api.dependencies import get_oauth_service

        mock_service = app.dependency_overrides[get_oauth_service]()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.get(
                "/api/v1/auth/oauth/google/callback",
                params={
                    "code": "test-auth-code",
                    "state": "test-state-token",
                },
                follow_redirects=False,
            )

            # Verify service was called with correct parameters
            mock_service.process_callback.assert_called_once()
            call_args = mock_service.process_callback.call_args
            assert call_args[1]["provider"] == "google"
            assert call_args[1]["code"] == "test-auth-code"
            assert call_args[1]["state"] == "test-state-token"
