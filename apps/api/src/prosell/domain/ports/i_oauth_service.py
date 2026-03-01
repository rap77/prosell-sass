"""OAuth service interface (Port in Clean Architecture).

This module defines the OAuth service interface following Clean Architecture
principles. The infrastructure layer will implement this interface (Adapter).

OAuth 2.0 Authorization Code Flow:
1. Frontend → GET /auth/oauth/{provider}/authorize
2. Backend generates state_token, redirects to provider
3. User authenticates at provider
4. Provider redirects to: GET /auth/oauth/{provider}/callback?code=...&state=...
5. Backend exchanges code for access_token
6. Backend fetches user info from provider
7. Backend creates/updates user and returns JWT tokens
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class OAuthUserInfo:
    """
    User information from OAuth provider.

    Attributes:
        provider_user_id: User's unique ID at the OAuth provider
        email: User's email address
        full_name: User's full name
        avatar_url: Optional profile picture URL
        access_token: OAuth access token (for API calls to provider)
        refresh_token: OAuth refresh token (to get new access tokens)
        expires_at: Access token expiration datetime
    """

    provider_user_id: str
    email: str
    full_name: str
    avatar_url: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: datetime | None = None


@dataclass(frozen=True)
class OAuthAuthorizeResult:
    """
    Result of OAuth authorization initiation.

    Contains the authorization URL where the user should be redirected
    and the state token for CSRF protection.

    Attributes:
        authorization_url: Full URL to OAuth provider's authorization page
        state_token: Unique token for CSRF validation (must match callback)
    """

    authorization_url: str
    state_token: str


@dataclass(frozen=True)
class OAuthCallbackResult:
    """
    Result of OAuth callback processing.

    Contains the user information fetched from the OAuth provider
    after exchanging the authorization code.

    Attributes:
        user_info: User information from OAuth provider
        provider: OAuth provider name ("google" or "facebook")
    """

    user_info: OAuthUserInfo
    provider: str


class IOAuthService(ABC):
    """
    OAuth service interface (Port in Clean Architecture).

    This interface defines the contract for OAuth 2.0 authorization code flow.
    The infrastructure layer implements this using httpx or requests-oauthlib.

    Implementation requirements:
    - Generate secure state tokens for CSRF protection
    - Store state tokens with expiration (recommended: 10 minutes)
    - Validate state tokens during callback
    - Handle OAuth errors gracefully
    - Support Google and Facebook OAuth providers

    State Token Storage (Implementation Note):
    - MVP: Use in-memory dict (OAuthServiceImpl._state_tokens)
    - Production: Use Redis for distributed state token storage
    """

    @abstractmethod
    async def initiate_authorization(
        self,
        provider: str,
        redirect_uri: str,
    ) -> OAuthAuthorizeResult:
        """
        Initiate OAuth authorization flow.

        Generates the authorization URL and state token.
        The user should be redirected to the authorization_url.

        Args:
            provider: OAuth provider name ("google" or "facebook")
            redirect_uri: Callback URL registered with OAuth provider
                        Must match exactly what's configured in provider's console

        Returns:
            OAuthAuthorizeResult with authorization URL and state token

        Raises:
            ValueError: If provider is not supported
            HTTPException: If authorization initiation fails

        Example:
            result = await oauth_service.initiate_authorization("google", redirect_uri)
            # Redirect user to result.authorization_url
            # Store result.state_token for callback validation
        """
        pass

    @abstractmethod
    async def process_callback(
        self,
        provider: str,
        code: str,
        state: str,
        redirect_uri: str,
    ) -> OAuthCallbackResult:
        """
        Process OAuth callback.

        Exchanges the authorization code for an access token,
        then fetches user information from the OAuth provider.

        Args:
            provider: OAuth provider name ("google" or "facebook")
            code: Authorization code from OAuth provider callback
            state: State token for CSRF validation (must match authorize)
            redirect_uri: Callback URL (must match authorize redirect_uri)

        Returns:
            OAuthCallbackResult with user information from provider

        Raises:
            ValueError: If state token is invalid or expired
            HTTPException: If OAuth flow fails (invalid code, network error, etc.)
            HTTPException(401): If access token is invalid
            HTTPException(500): If fetching user info fails

        Example:
            result = await oauth_service.process_callback(
                provider="google",
                code="auth_code_from_callback",
                state="state_token_from_authorize",
                redirect_uri=redirect_uri
            )
            # Use result.user_info to create/update user
        """
        pass

    @abstractmethod
    async def validate_state(self, state: str) -> bool:
        """
        Validate OAuth state token for CSRF protection.

        State tokens prevent CSRF attacks by ensuring the callback
        request originates from the same authorization initiation.

        Args:
            state: State token to validate

        Returns:
            True if state token is valid and not expired
            False if state token is invalid, expired, or already used

        Implementation Note:
            - State tokens should expire after 10 minutes
            - State tokens should be single-use (consume after validation)
            - In production, use Redis for distributed state storage
        """
        pass

    @abstractmethod
    async def consume_state(self, state: str) -> None:
        """
        Consume (delete) a state token after successful validation.

        This ensures state tokens are single-use, preventing replay attacks.

        Args:
            state: State token to consume

        Implementation Note:
            Call this after successful callback processing to prevent
            the same state token from being used again.
        """
        pass
