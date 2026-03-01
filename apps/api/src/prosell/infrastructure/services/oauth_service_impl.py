"""OAuth service implementation using httpx for async HTTP requests.

This module implements the IOAuthService port using httpx for OAuth 2.0
authorization code flow with Google and Facebook providers.

Architecture:
- This is an Adapter in Clean Architecture terminology
- Implements the IOAuthService Port defined in domain layer
- Uses httpx.AsyncClient for non-blocking HTTP requests
- State tokens stored in Redis for distributed state management

OAuth 2.0 Flow:
1. initiate_authorization(): Generate state token, build authorization URL
2. User authenticates at OAuth provider (Google/Facebook)
3. process_callback(): Exchange code for access token, fetch user info
4. validate_state(): Verify state token for CSRF protection
"""

import logging
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode
from uuid import uuid4

import httpx
import redis.asyncio as redis
from fastapi import HTTPException, status

from prosell.core.config import OAuthSettings, settings
from prosell.domain.ports.i_oauth_service import (
    IOAuthService,
    OAuthAuthorizeResult,
    OAuthCallbackResult,
    OAuthUserInfo,
)

logger = logging.getLogger(__name__)


class OAuthServiceImpl(IOAuthService):
    """
    OAuth service implementation.

    Handles OAuth 2.0 authorization code flow for Google and Facebook.

    Attributes:
        settings: OAuth configuration settings
        _redis: Redis client for distributed state token storage

    Security Notes:
        - State tokens expire after configured minutes (default: 10)
        - State tokens are single-use (consumed after validation)
        - Authorization codes are single-use and expire quickly
        - Access tokens are stored for potential API calls to provider

    Production Recommendations:
        - Use Redis for distributed state token storage
        - Add rate limiting for initiate_authorization()
        - Add monitoring for failed OAuth attempts
        - Cache provider discovery documents (Google)
    """

    def __init__(self, settings: OAuthSettings) -> None:
        """
        Initialize OAuth service.

        Args:
            settings: OAuth configuration settings
        """
        self.settings = settings
        # Redis client for distributed state token storage
        self._redis: redis.Redis | None = None

    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis client."""
        if self._redis is None:
            self._redis = await redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis

    async def _save_state_token(self, state: str, expiry: datetime) -> None:
        """Save state token to Redis with expiration."""
        redis_client = await self._get_redis()
        ttl_seconds = int((expiry - datetime.now(UTC)).total_seconds())
        await redis_client.setex(f"oauth:state:{state}", ttl_seconds, "1")

    async def _validate_state_token(self, state: str) -> bool:
        """Validate state token in Redis."""
        redis_client = await self._get_redis()
        return await redis_client.exists(f"oauth:state:{state}") > 0

    async def _consume_state_token(self, state: str) -> None:
        """Consume (delete) state token from Redis."""
        redis_client = await self._get_redis()
        await redis_client.delete(f"oauth:state:{state}")

    async def initiate_authorization(
        self,
        provider: str,
        redirect_uri: str,
    ) -> OAuthAuthorizeResult:
        """
        Initiate OAuth authorization flow.

        Generates state token and builds authorization URL for the provider.

        Args:
            provider: OAuth provider name ("google" or "facebook")
            redirect_uri: Callback URL registered with OAuth provider

        Returns:
            OAuthAuthorizeResult with authorization URL and state token

        Raises:
            HTTPException(400): If provider is not supported
            HTTPException(500): If required credentials are missing
        """
        provider = provider.lower()

        if provider == "google":
            return await self._initiate_google_authorization(redirect_uri)
        elif provider == "facebook":
            return await self._initiate_facebook_authorization(redirect_uri)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {provider}. Supported: google, facebook",
            )

    async def _initiate_google_authorization(
        self,
        redirect_uri: str,
    ) -> OAuthAuthorizeResult:
        """
        Initiate Google OAuth 2.0 authorization flow.

        Google OAuth 2.0 Documentation:
        https://developers.google.com/identity/protocols/oauth2

        Args:
            redirect_uri: Callback URL registered in Google Cloud Console

        Returns:
            OAuthAuthorizeResult with Google authorization URL

        Raises:
            HTTPException(500): If Google OAuth credentials are not configured
        """
        if not self.settings.google_oauth_client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth is not configured. Missing client ID.",
            )

        # Generate unique state token for CSRF protection
        state = str(uuid4())

        # Store state token with expiration
        expiry = datetime.now(UTC) + timedelta(minutes=self.settings.state_token_expire_minutes)
        await self._save_state_token(state, expiry)

        # Build authorization URL parameters
        # https://accounts.google.com/o/oauth2/v2/auth
        params = {
            "client_id": self.settings.google_oauth_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",  # Enable refresh tokens
            "prompt": "consent",  # Force consent dialog to get refresh token
        }

        # Build authorization URL
        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        authorization_url = f"{base_url}?{urlencode(params)}"

        logger.info(f"Initiated Google OAuth authorization for state={state[:8]}...")

        return OAuthAuthorizeResult(
            authorization_url=authorization_url,
            state_token=state,
        )

    async def _initiate_facebook_authorization(
        self,
        redirect_uri: str,
    ) -> OAuthAuthorizeResult:
        """
        Initiate Facebook OAuth 2.0 authorization flow.

        Facebook OAuth Documentation:
        https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow

        Args:
            redirect_uri: Callback URL registered in Facebook App settings

        Returns:
            OAuthAuthorizeResult with Facebook authorization URL

        Raises:
            HTTPException(500): If Facebook OAuth credentials are not configured
        """
        if not self.settings.facebook_app_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Facebook OAuth is not configured. Missing app ID.",
            )

        # Generate unique state token for CSRF protection
        state = str(uuid4())

        # Store state token with expiration
        expiry = datetime.now(UTC) + timedelta(minutes=self.settings.state_token_expire_minutes)
        await self._save_state_token(state, expiry)

        # Build authorization URL parameters
        # https://www.facebook.com/v18.0/dialog/oauth
        params = {
            "client_id": self.settings.facebook_app_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "email,public_profile",
            "state": state,
        }

        # Build authorization URL
        base_url = "https://www.facebook.com/v18.0/dialog/oauth"
        authorization_url = f"{base_url}?{urlencode(params)}"

        logger.info(f"Initiated Facebook OAuth authorization for state={state[:8]}...")

        return OAuthAuthorizeResult(
            authorization_url=authorization_url,
            state_token=state,
        )

    async def process_callback(
        self,
        provider: str,
        code: str,
        state: str,
        redirect_uri: str,
    ) -> OAuthCallbackResult:
        """
        Process OAuth callback from provider.

        Validates state token, exchanges authorization code for access token,
        and fetches user information from the provider.

        Args:
            provider: OAuth provider name ("google" or "facebook")
            code: Authorization code from callback
            state: State token for CSRF validation
            redirect_uri: Callback URL (must match authorize)

        Returns:
            OAuthCallbackResult with user information from provider

        Raises:
            HTTPException(400): If state token is invalid or expired
            HTTPException(401): If access token is invalid
            HTTPException(500): If fetching user info fails
        """
        # Validate state token first (CSRF protection)
        if not await self.validate_state(state):
            logger.warning(f"Invalid or expired state token: {state[:8]}...")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired state token. Please try again.",
            )

        # Consume state token (single-use)
        await self.consume_state(state)

        provider = provider.lower()

        if provider == "google":
            return await self._process_google_callback(code, redirect_uri)
        elif provider == "facebook":
            return await self._process_facebook_callback(code, redirect_uri)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {provider}",
            )

    async def _process_google_callback(
        self,
        code: str,
        redirect_uri: str,
    ) -> OAuthCallbackResult:
        """
        Process Google OAuth callback.

        Exchanges authorization code for access token and fetches user info.

        Args:
            code: Authorization code from Google callback
            redirect_uri: Callback URL (must match authorize)

        Returns:
            OAuthCallbackResult with user info from Google

        Raises:
            HTTPException(500): If token exchange or user info fetch fails
        """
        if not self.settings.google_oauth_client_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth is not configured. Missing client secret.",
            )

        # Exchange authorization code for access token
        # POST https://oauth2.googleapis.com/token
        try:
            async with httpx.AsyncClient() as client:
                token_response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": self.settings.google_oauth_client_id,
                        "client_secret": self.settings.google_oauth_client_secret,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                    },
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                )
                token_response.raise_for_status()
                token_data = token_response.json()

                access_token = token_data.get("access_token")
                refresh_token = token_data.get("refresh_token")
                expires_in = token_data.get("expires_in", 3600)

                if not access_token:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Failed to obtain access token from Google",
                    )

                logger.info("Successfully exchanged Google authorization code for access token")

        except httpx.HTTPStatusError as e:
            logger.error(
                f"Google token exchange failed: {e.response.status_code} - {e.response.text}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to exchange authorization code with Google",
            ) from e
        except Exception as e:
            logger.error(f"Unexpected error during Google token exchange: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to complete Google OAuth flow",
            ) from e

        # Fetch user information from Google
        # GET https://www.googleapis.com/oauth2/v2/userinfo
        try:
            async with httpx.AsyncClient() as client:
                user_response = await client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                    },
                )
                user_response.raise_for_status()
                user_data = user_response.json()

                logger.info(
                    f"Successfully fetched user info for Google user: {user_data.get('email')}"
                )

        except httpx.HTTPStatusError as e:
            logger.error(f"Google user info fetch failed: {e.response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to fetch user information from Google",
            ) from e
        except Exception as e:
            logger.error(f"Unexpected error fetching Google user info: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch user information",
            ) from e

        # Build OAuthUserInfo
        expires_at = datetime.now(UTC) + timedelta(seconds=int(expires_in))

        user_info = OAuthUserInfo(
            provider_user_id=user_data["id"],
            email=user_data["email"],
            full_name=user_data.get("name", ""),
            avatar_url=user_data.get("picture"),
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )

        return OAuthCallbackResult(
            user_info=user_info,
            provider="google",
        )

    async def _process_facebook_callback(
        self,
        code: str,
        redirect_uri: str,
    ) -> OAuthCallbackResult:
        """
        Process Facebook OAuth callback.

        Exchanges authorization code for access token and fetches user info.

        Args:
            code: Authorization code from Facebook callback
            redirect_uri: Callback URL (must match authorize)

        Returns:
            OAuthCallbackResult with user info from Facebook

        Raises:
            HTTPException(500): If token exchange or user info fetch fails
        """
        if not self.settings.facebook_app_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Facebook OAuth is not configured. Missing app secret.",
            )

        # Exchange authorization code for access token
        # GET https://graph.facebook.com/v18.0/oauth/access_token
        try:
            async with httpx.AsyncClient() as client:
                token_response = await client.get(
                    "https://graph.facebook.com/v18.0/oauth/access_token",
                    params={
                        "code": code,
                        "client_id": self.settings.facebook_app_id,
                        "client_secret": self.settings.facebook_app_secret,
                        "redirect_uri": redirect_uri,
                    },
                )
                token_response.raise_for_status()
                token_data = token_response.json()

                access_token = token_data.get("access_token")

                if not access_token:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Failed to obtain access token from Facebook",
                    )

                logger.info("Successfully exchanged Facebook authorization code for access token")

        except httpx.HTTPStatusError as e:
            logger.error(
                f"Facebook token exchange failed: {e.response.status_code} - {e.response.text}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to exchange authorization code with Facebook",
            ) from e
        except Exception as e:
            logger.error(f"Unexpected error during Facebook token exchange: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to complete Facebook OAuth flow",
            ) from e

        # Fetch user information from Facebook
        # GET https://graph.facebook.com/me?fields=...
        try:
            async with httpx.AsyncClient() as client:
                user_response = await client.get(
                    "https://graph.facebook.com/me",
                    params={
                        "fields": "id,email,name,picture.width(512)",
                        "access_token": access_token,
                    },
                )
                user_response.raise_for_status()
                user_data = user_response.json()

                logger.info(
                    f"Successfully fetched user info for Facebook user: {user_data.get('email')}"
                )

        except httpx.HTTPStatusError as e:
            logger.error(f"Facebook user info fetch failed: {e.response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to fetch user information from Facebook",
            ) from e
        except Exception as e:
            logger.error(f"Unexpected error fetching Facebook user info: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch user information",
            ) from e

        # Build OAuthUserInfo
        avatar_url = None
        if user_data.get("picture"):
            avatar_url = user_data["picture"]["data"]["url"]

        user_info = OAuthUserInfo(
            provider_user_id=user_data["id"],
            email=user_data.get("email", ""),
            full_name=user_data.get("name", ""),
            avatar_url=avatar_url,
            access_token=access_token,
            refresh_token=None,  # Facebook short-lived tokens don't include refresh token
            expires_at=None,  # Facebook token expiration is complex (short-lived vs long-lived)
        )

        return OAuthCallbackResult(
            user_info=user_info,
            provider="facebook",
        )

    async def validate_state(self, state: str) -> bool:
        """
        Validate OAuth state token for CSRF protection.

        Args:
            state: State token to validate

        Returns:
            True if state token is valid and not expired
            False if state token is invalid, expired, or not found
        """
        return await self._validate_state_token(state)

    async def consume_state(self, state: str) -> None:
        """
        Consume (delete) a state token after successful validation.

        Ensures state tokens are single-use to prevent replay attacks.

        Args:
            state: State token to consume
        """
        await self._consume_state_token(state)
