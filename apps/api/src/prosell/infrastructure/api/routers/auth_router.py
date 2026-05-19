"""Authentication router for ProSell SaaS API."""

import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import RedirectResponse

# DTOs - all from central dto module
from prosell.application.dto.auth import (
    ChangePasswordRequest as ChangePasswordUCRequest,
)
from prosell.application.dto.auth import (
    ChangePasswordResponse,
    Disable2FAResponse,
    Enable2FAResponse,
    LoginUserRequest,
    LoginUserResponse,
    OAuthLoginResponse,
    RefreshTokenResponse,
    RegisterUserRequest,
    RegisterUserResponse,
    Verify2FAResponse,
)
from prosell.application.dto.auth import (
    Disable2FARequest as Disable2FAUCRequest,
)
from prosell.application.dto.auth import (
    Enable2FARequest as Enable2FAUCRequest,
)
from prosell.application.dto.auth import (
    OAuthLoginRequest as OAuthLoginUCRequest,
)
from prosell.application.dto.auth import (
    RefreshTokenRequest as RefreshTokenUCRequest,
)
from prosell.application.dto.auth import (
    Verify2FARequest as Verify2FAUCRequest,
)

# Use cases - only import the use case classes
from prosell.application.use_cases.auth.change_password import ChangePasswordUseCase
from prosell.application.use_cases.auth.enable_2fa import (
    Disable2FAUseCase,
    Enable2FAUseCase,
)
from prosell.application.use_cases.auth.login_user import LoginUserUseCase
from prosell.application.use_cases.auth.oauth_login import OAuthLoginUseCase
from prosell.application.use_cases.auth.refresh_token import RefreshTokenUseCase
from prosell.application.use_cases.auth.register_user import RegisterUserUseCase
from prosell.application.use_cases.auth.verify_2fa import Verify2FAUseCase
from prosell.core.config import settings
from prosell.domain.entities.user import User
from prosell.domain.exceptions.auth_exceptions import (
    OAuthCallbackError,
    OAuthConfigurationError,
    OAuthProviderNotSupportedError,
    OAuthStateInvalidError,
)
from prosell.domain.ports import IOAuthService
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.infrastructure.api.dependencies import (
    get_change_password_use_case,
    get_current_auth_user_from_cookie,
    get_disable_2fa_use_case,
    get_enable_2fa_use_case,
    get_login_user_use_case,
    get_oauth_login_use_case,
    get_oauth_service,
    get_refresh_token_use_case,
    get_register_user_use_case,
    get_user_repository,
    get_verify_2fa_use_case,
)

# Rate limiting for OAuth endpoints
# OAuth authorize/initiate endpoints are rate limited to prevent abuse
from prosell.infrastructure.api.middleware import smart_rate_limit
from prosell.infrastructure.api.middleware.auth_middleware import (
    AuthTokenPayload,
    get_current_user,
    get_optional_user,
)
from prosell.infrastructure.api.schemas import (
    AuthStateResponse,
    ChangePasswordRequest,
    Disable2FARequest,
    HealthCheckResponse,
    LoginRequest,
    LogoutResponse,
    MeResponse,
    OAuthLoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    Verify2FARequest,
)
from prosell.infrastructure.api.schemas.responses import AuthStateUserResponse

router = APIRouter()
logger = logging.getLogger(__name__)


# =============================================================================
# HEALTH CHECK ENDPOINT
# =============================================================================


@router.get("/health", response_model=HealthCheckResponse)
async def health_check() -> HealthCheckResponse:
    """
    Health check endpoint.
    Returns the current status of the API.
    Does not require authentication.
    """
    return HealthCheckResponse(
        status="healthy",
        timestamp=datetime.now(UTC).isoformat(),
        service="prosell-api",
        version="0.1.0",
    )


# =============================================================================
# OAUTH HELPER FUNCTIONS
# =============================================================================


def _get_provider_redirect_uris() -> dict[str, str]:
    """
    Get OAuth provider redirect URIs from settings.

    Module-level helper to avoid duplication between authorize and callback endpoints.
    Maps provider names to their configured backend callback URIs.
    """
    return {
        "google": settings.google_oauth_redirect_uri,
        "facebook": settings.facebook_oauth_redirect_uri,
    }


# =============================================================================
# ENDPOINTS
# =============================================================================


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.post(
    "/register",
    response_model=RegisterUserResponse,
    status_code=status.HTTP_201_CREATED,
)
@smart_rate_limit("auth")  # Higher rate limit for testing
async def register(
    request: Request,
    register_request: RegisterRequest,
    use_case: Annotated[RegisterUserUseCase, Depends(get_register_user_use_case)],
) -> RegisterUserResponse:
    """
    Register a new user.

    - **email**: User email address (must be unique)
    - **password**: Password (min 8 characters, must contain uppercase, lowercase, number, special)
    - **full_name**: User's full name
    - **accept_terms**: Must accept terms and conditions

    Sets httpOnly cookies for authentication tokens.
    """
    _ = request
    uc_request = RegisterUserRequest(
        email=register_request.email,
        password=register_request.password,
        full_name=register_request.full_name,
        accept_terms=register_request.accept_terms,
    )
    result = await use_case.execute(uc_request)

    # Note: Registration does NOT set auth cookies because user must verify email first
    # User will need to login after email verification

    return result


@router.post("/login", response_model=LoginUserResponse)
@smart_rate_limit("auth")  # Higher rate limit for testing
async def login(
    request: Request,
    login_data: LoginRequest,
    response: Response,
    use_case: Annotated[LoginUserUseCase, Depends(get_login_user_use_case)],
) -> LoginUserResponse:
    """
    User login.

    Returns access and refresh tokens via httpOnly cookies.
    If 2FA is enabled, requires_2fa will be True.
    """
    _ = request
    uc_request = LoginUserRequest(
        email=login_data.email,
        password=login_data.password,
        remember_me=login_data.remember_me,
    )
    result = await use_case.execute(uc_request)

    # Set httpOnly cookies for tokens
    access_token_expiry = datetime.now(UTC) + timedelta(minutes=15)
    refresh_token_expiry = datetime.now(UTC) + timedelta(days=7)

    response.set_cookie(
        key="access_token",
        value=result.access_token,
        expires=access_token_expiry,
        httponly=True,  # CRITICAL: Prevents JavaScript access (XSS protection)
        secure=settings.environment != "development",  # HTTPS only outside dev
        samesite="lax",  # Lax for OAuth compatibility
        domain=settings.cookie_domain,  # Share across all localhost ports
    )

    response.set_cookie(
        key="refresh_token",
        value=result.refresh_token,
        expires=refresh_token_expiry,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        domain=settings.cookie_domain,
    )

    # Also set user_data cookie for server components
    # NOTE: URL-encode to avoid Python SimpleCookie octal-encoding JSON special chars
    response.set_cookie(
        key="user_data",
        value=quote(result.user.model_dump_json()),
        expires=refresh_token_expiry,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        domain=settings.cookie_domain,
    )

    return result


@router.post("/refresh", response_model=RefreshTokenResponse)
@smart_rate_limit("auth")  # Higher rate limit for testing
async def refresh_token(
    request: Request,
    refresh_request: RefreshTokenRequest,
    use_case: Annotated[RefreshTokenUseCase, Depends(get_refresh_token_use_case)],
) -> RefreshTokenResponse:
    """
    Refresh access token using refresh token.

    - **refresh_token**: Valid refresh token
    """
    _ = request
    uc_request = RefreshTokenUCRequest(refresh_token=refresh_request.refresh_token)
    return await use_case.execute(uc_request)


@router.post("/oauth/{provider}", response_model=OAuthLoginResponse)
@smart_rate_limit("auth")  # Higher rate limit for testing
async def oauth_login(
    provider: str,
    request: Request,
    oauth_request: OAuthLoginRequest,
    use_case: Annotated[OAuthLoginUseCase, Depends(get_oauth_login_use_case)],
) -> OAuthLoginResponse:
    """
    OAuth social login (direct).

    This endpoint is for testing and direct OAuth login with pre-fetched user data.
    For browser-based OAuth flow, use /oauth/{provider}/authorize instead.

    Supports Google and Facebook OAuth.
    """
    _ = request
    uc_request = OAuthLoginUCRequest(
        provider=provider,
        provider_user_id=oauth_request.provider_user_id,
        email=oauth_request.email,
        full_name=oauth_request.full_name,
        avatar_url=oauth_request.avatar_url,
    )
    return await use_case.execute(uc_request)


@router.get(
    "/oauth/{provider}/authorize",
    response_model=None,
    response_class=RedirectResponse,
)
@smart_rate_limit("auth")  # Higher rate limit for testing
async def oauth_authorize(
    provider: str,
    request: Request,
    oauth_service: Annotated[IOAuthService, Depends(get_oauth_service)],
) -> RedirectResponse:
    """
    Initiate OAuth authorization flow.

    Redirects user to OAuth provider (Google/Facebook) for authentication.

    **OAuth 2.0 Authorization Code Flow:**

    1. User clicks "Login with Google/Facebook"
    2. Frontend redirects to this endpoint
    3. Backend generates state_token (CSRF protection)
    4. Backend redirects user to OAuth provider
    5. User authenticates at provider
    6. Provider redirects to /oauth/{provider}/callback

    **Path Parameters:**
        provider: "google" or "facebook"

    **Returns:**
        302 Redirect to OAuth provider authorization page

    **Example:**
        GET /api/v1/auth/oauth/google/authorize
        → Redirects to: https://accounts.google.com/o/oauth2/v2/auth?...
    """
    _ = request
    try:
        # Get provider redirect URI from settings
        provider_redirect_uris = _get_provider_redirect_uris()
        redirect_uri = provider_redirect_uris.get(provider, "")

        # Initiate OAuth flow: get authorization URL and state token
        result = await oauth_service.initiate_authorization(
            provider=provider,
            redirect_uri=redirect_uri,
        )

        logger.info(
            f"OAuth authorization initiated for provider={provider}, "
            f"state={result.state_token[:8]}..."
        )

        # Redirect user to OAuth provider authorization page
        return RedirectResponse(url=result.authorization_url, status_code=302)

    except OAuthProviderNotSupportedError:
        logger.warning(f"Unsupported OAuth provider: {provider}")
        return RedirectResponse(
            url=f"{settings.oauth_frontend_failure_url}unsupported_provider",
            status_code=302,
        )
    except OAuthConfigurationError as e:
        logger.error(f"OAuth configuration error for {provider}: {e.message}")
        return RedirectResponse(
            url=f"{settings.oauth_frontend_failure_url}oauth_failed",
            status_code=302,
        )


@router.get(
    "/oauth/{provider}/callback",
    response_model=None,
    response_class=RedirectResponse,
)
@smart_rate_limit("auth")  # Higher rate limit for testing
async def oauth_callback(
    provider: str,
    request: Request,
    oauth_service: Annotated[IOAuthService, Depends(get_oauth_service)],
    oauth_use_case: Annotated[OAuthLoginUseCase, Depends(get_oauth_login_use_case)],
    code: str | None = Query(None, description="Authorization code from OAuth provider"),
    state: str | None = Query(None, description="State token for CSRF protection"),
    error: str | None = Query(None, description="Error from OAuth provider (if auth failed)"),
) -> RedirectResponse:
    """
    OAuth callback endpoint.

    Called by OAuth provider after user authentication.

    **OAuth 2.0 Callback Flow:**

    1. User authenticates at Google/Facebook
    2. Provider redirects to this endpoint with authorization code
    3. Backend validates state token (CSRF protection)
    4. Backend exchanges code for access token
    5. Backend fetches user info from provider
    6. Backend creates/updates user and generates JWT tokens
    7. Backend sets httpOnly cookies
    8. Backend redirects to frontend with user logged in

    **Path Parameters:**
        provider: "google" or "facebook"

    **Query Parameters:**
        code: Authorization code (if successful)
        state: State token for CSRF validation
        error: Error description (if user denied access)

    **Returns:**
        302 Redirect to frontend with auth cookies (success) or error page (failure)

    **Example:**
        GET /api/v1/auth/oauth/google/callback?code=abc123&state=xyz789
        → Sets cookies
        → Redirects to: http://localhost:3000/dashboard
    """
    # Handle OAuth error from provider (user denied access)
    _ = request
    if error:
        logger.warning(f"OAuth callback error for provider={provider}: {error}")
        # Sanitize provider error to allowed values only
        allowed_oauth_errors = {"access_denied", "server_error", "temporarily_unavailable"}
        safe_error = error if error in allowed_oauth_errors else "oauth_error"
        error_url = f"{settings.oauth_frontend_failure_url}{safe_error}"
        return RedirectResponse(url=error_url, status_code=302)

    # Validate required parameters for successful OAuth flow
    if not code or not state:
        logger.error(
            f"OAuth callback missing required parameters: code={bool(code)}, state={bool(state)}"
        )
        error_url = f"{settings.oauth_frontend_failure_url}invalid_request"
        return RedirectResponse(url=error_url, status_code=302)

    try:
        # Get provider redirect URI from settings (must match authorize)
        provider_redirect_uris = _get_provider_redirect_uris()
        redirect_uri = provider_redirect_uris.get(provider, "")

        # Process callback: exchange code for user info
        callback_result = await oauth_service.process_callback(
            provider=provider,
            code=code,
            state=state,
            redirect_uri=redirect_uri,
        )

        logger.info(
            f"OAuth callback successful for provider={provider}, "
            f"user={callback_result.user_info.email}"
        )

        # Login using OAuthLoginUseCase (create/update user, generate JWT)
        oauth_uc_request = OAuthLoginUCRequest(
            provider=callback_result.provider,
            provider_user_id=callback_result.user_info.provider_user_id,
            email=callback_result.user_info.email,
            full_name=callback_result.user_info.full_name,
            avatar_url=callback_result.user_info.avatar_url,
            access_token=callback_result.user_info.access_token,
            refresh_token=callback_result.user_info.refresh_token,
            expires_at=callback_result.user_info.expires_at,
        )

        login_result = await oauth_use_case.execute(oauth_uc_request)

        # Set httpOnly cookies directly on the RedirectResponse.
        # CRITICAL: Cookies MUST be set on the response object being returned.
        # Setting them on a FastAPI-injected Response parameter is ignored when
        # the endpoint returns a different Response object (RedirectResponse).
        access_token_expiry = datetime.now(UTC) + timedelta(
            minutes=settings.jwt_access_token_expire_minutes
        )
        refresh_token_expiry = datetime.now(UTC) + timedelta(
            days=settings.jwt_refresh_token_expire_days
        )

        redirect = RedirectResponse(url=settings.oauth_frontend_success_url, status_code=302)

        # NOTE: SameSite=Lax (not Strict) is required for OAuth callbacks.
        # OAuth flow navigates through a cross-site provider (Google/Facebook), so
        # SameSite=Strict would block the cookies from being sent after the redirect.
        # Lax allows cookies in top-level GET navigations (safe for OAuth) while
        # still blocking cross-site fetch/XHR (sufficient CSRF protection).
        redirect.set_cookie(
            key="access_token",
            value=login_result.access_token,
            expires=access_token_expiry,
            path="/",  # CRITICAL: Make cookie available to all paths
            httponly=True,  # CRITICAL: Prevents JavaScript access (XSS protection)
            secure=settings.environment != "development",  # HTTPS only outside dev
            samesite="lax",  # Lax required: OAuth redirect chain crosses google.com
            domain=settings.cookie_domain,  # Share across all localhost ports
        )

        redirect.set_cookie(
            key="refresh_token",
            value=login_result.refresh_token,
            expires=refresh_token_expiry,
            path="/",  # CRITICAL: Make cookie available to all paths
            httponly=True,
            secure=settings.environment != "development",
            samesite="lax",
            domain=settings.cookie_domain,
        )

        redirect.set_cookie(
            key="user_data",
            value=quote(login_result.user.model_dump_json()),
            expires=refresh_token_expiry,
            path="/",  # CRITICAL: Make cookie available to all paths
            httponly=True,
            secure=settings.environment != "development",
            samesite="lax",
            domain=settings.cookie_domain,
        )

        logger.info(
            f"User logged in via OAuth: {login_result.user.email}, redirecting to dashboard"
        )

        return redirect

    except OAuthStateInvalidError:
        logger.warning(f"Invalid OAuth state token for provider={provider}")
        error_url = f"{settings.oauth_frontend_failure_url}invalid_state"
        return RedirectResponse(url=error_url, status_code=302)

    except OAuthProviderNotSupportedError:
        logger.warning(f"Unsupported OAuth provider requested: {provider}")
        error_url = f"{settings.oauth_frontend_failure_url}unsupported_provider"
        return RedirectResponse(url=error_url, status_code=302)

    except (OAuthConfigurationError, OAuthCallbackError) as e:
        logger.error(f"OAuth error for provider={provider}: {e.message}")
        error_url = f"{settings.oauth_frontend_failure_url}oauth_failed"
        return RedirectResponse(url=error_url, status_code=302)

    except Exception as e:
        # Unexpected error
        logger.exception(f"Unexpected OAuth callback error for provider={provider}: {e}")
        error_url = f"{settings.oauth_frontend_failure_url}internal_error"
        return RedirectResponse(url=error_url, status_code=302)


@router.post("/change-password", response_model=ChangePasswordResponse)
@smart_rate_limit("auth")
async def change_password(
    change_request: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[ChangePasswordUseCase, Depends(get_change_password_use_case)],
) -> ChangePasswordResponse:
    """Change the authenticated user's password."""
    uc_request = ChangePasswordUCRequest(
        current_password=change_request.current_password,
        new_password=change_request.new_password,
    )

    return await use_case.execute(current_user.id, uc_request)


@router.post("/2fa/enable", response_model=Enable2FAResponse)
@smart_rate_limit("auth")  # Higher rate limit for testing
async def enable_2fa(
    request: Request,
    current_user: Annotated[AuthTokenPayload, Depends(get_current_user)],
    use_case: Annotated[Enable2FAUseCase, Depends(get_enable_2fa_use_case)],
) -> Enable2FAResponse:
    """
    Enable two-factor authentication.

    Returns TOTP secret, QR code URI, and backup codes.
    Save the backup codes securely!
    """
    _ = request
    uc_request = Enable2FAUCRequest(user_id=UUID(current_user["sub"]))
    return await use_case.execute(uc_request)


@router.post("/2fa/verify", response_model=Verify2FAResponse)
@smart_rate_limit("auth")  # Higher rate limit for testing
async def verify_2fa(
    request: Request,
    verify_request: Verify2FARequest,
    current_user: Annotated[AuthTokenPayload, Depends(get_current_user)],
    use_case: Annotated[Verify2FAUseCase, Depends(get_verify_2fa_use_case)],
) -> Verify2FAResponse:
    """
    Verify 2FA code for the authenticated user.

    Accepts either TOTP code from authenticator app or backup code.
    """
    _ = request
    uc_request = Verify2FAUCRequest(
        user_id=UUID(current_user["sub"]),
        code=verify_request.code,
    )
    return await use_case.execute(uc_request)


@router.post("/2fa/disable", response_model=Disable2FAResponse)
@smart_rate_limit("auth")  # Higher rate limit for testing
async def disable_2fa(
    request: Request,
    disable_request: Disable2FARequest,
    current_user: Annotated[AuthTokenPayload, Depends(get_current_user)],
    use_case: Annotated[Disable2FAUseCase, Depends(get_disable_2fa_use_case)],
) -> Disable2FAResponse:
    """
    Disable two-factor authentication.

    Requires a valid TOTP code to confirm.
    """
    _ = request
    uc_request = Disable2FAUCRequest(
        user_id=UUID(current_user["sub"]),
        totp_code=disable_request.totp_code,
    )
    return await use_case.execute(uc_request)


@router.get("/state", response_model=AuthStateResponse)
async def get_auth_state(
    current_user: Annotated[AuthTokenPayload | None, Depends(get_optional_user)],
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
) -> AuthStateResponse:
    """
    Get current authentication state from httpOnly cookies.

    Server Components use this to check auth status without
    exposing tokens to client-side code.

    Returns user data and authentication status based on cookies.
    """
    if not current_user:
        return AuthStateResponse(is_authenticated=False, user=None)

    user = await user_repository.get_by_id(UUID(current_user["sub"]))
    if not user:
        return AuthStateResponse(is_authenticated=False, user=None)

    name_parts = user.full_name.split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    return AuthStateResponse(
        is_authenticated=True,
        user=AuthStateUserResponse(
            id=current_user["sub"],
            email=user.email,
            first_name=first_name,
            last_name=last_name,
            role=current_user.get("roles", [None])[0],
            is_email_verified=user.email_verified,
            is_2fa_enabled=user.is_2fa_enabled,
        ),
    )


@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user: Annotated[AuthTokenPayload, Depends(get_current_user)],
) -> MeResponse:
    """
    Get current user info from JWT token.

    Returns basic user information from the access token.
    """
    return MeResponse(
        id=current_user["sub"],
        roles=current_user.get("roles", []),
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(response: Response) -> LogoutResponse:
    """
    Logout user.

    Clears httpOnly cookies by setting them with expiration in the past.
    """
    # Clear cookies by setting them with expired date
    # CRITICAL: Must match cookie parameters from login (domain, path, samesite)
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        domain=settings.cookie_domain,
    )
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        domain=settings.cookie_domain,
    )
    response.delete_cookie(
        key="user_data",
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        domain=settings.cookie_domain,
    )

    return LogoutResponse(message="Logout successful")
