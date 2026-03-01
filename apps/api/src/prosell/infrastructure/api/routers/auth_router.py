"""Authentication router for ProSell SaaS API."""

import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse

from prosell.application.use_cases.auth.enable_2fa import (
    Disable2FARequest as Disable2FAUCRequest,
)
from prosell.application.use_cases.auth.enable_2fa import (
    Disable2FAResponse,
    Disable2FAUseCase,
    Enable2FAResponse,
    Enable2FAUseCase,
)
from prosell.application.use_cases.auth.enable_2fa import (
    Enable2FARequest as Enable2FAUCRequest,
)
from prosell.application.use_cases.auth.login_user import (
    LoginUserRequest,
    LoginUserResponse,
    LoginUserUseCase,
)
from prosell.application.use_cases.auth.oauth_login import (
    OAuthLoginRequest as OAuthLoginUCRequest,
)
from prosell.application.use_cases.auth.oauth_login import (
    OAuthLoginResponse,
    OAuthLoginUseCase,
)
from prosell.application.use_cases.auth.refresh_token import (
    RefreshTokenRequest as RefreshTokenUCRequest,
)
from prosell.application.use_cases.auth.refresh_token import (
    RefreshTokenResponse,
    RefreshTokenUseCase,
)
from prosell.application.use_cases.auth.register_user import (
    RegisterUserRequest,
    RegisterUserResponse,
    RegisterUserUseCase,
)
from prosell.application.use_cases.auth.verify_2fa import (
    Verify2FARequest as Verify2FAUCRequest,
)
from prosell.application.use_cases.auth.verify_2fa import (
    Verify2FAResponse,
    Verify2FAUseCase,
)
from prosell.core.config import settings
from prosell.domain.ports import IOAuthService
from prosell.infrastructure.api.dependencies import (
    get_disable_2fa_use_case,
    get_enable_2fa_use_case,
    get_login_user_use_case,
    get_oauth_login_use_case,
    get_oauth_service,
    get_refresh_token_use_case,
    get_register_user_use_case,
    get_verify_2fa_use_case,
)

# Rate limiting for OAuth endpoints
# OAuth authorize/initiate endpoints are rate limited to prevent abuse
from prosell.infrastructure.api.middleware import AUTH_LIMIT, rate_limit
from prosell.infrastructure.api.middleware.auth_middleware import (
    get_current_user,
    get_optional_user,
)
from prosell.infrastructure.api.schemas import (
    Disable2FARequest,
    Enable2FARequest,
    LoginRequest,
    LogoutResponse,
    OAuthLoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    Verify2FARequest,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
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
    uc_request = RegisterUserRequest(
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        accept_terms=request.accept_terms,
    )
    result = await use_case.execute(uc_request)

    # Note: Registration does NOT set auth cookies because user must verify email first
    # User will need to login after email verification

    return result


@router.post("/login")
async def login(
    request: LoginRequest,
    response: Response,
    use_case: Annotated[LoginUserUseCase, Depends(get_login_user_use_case)],
) -> LoginUserResponse:
    """
    User login.

    Returns access and refresh tokens via httpOnly cookies.
    If 2FA is enabled, requires_2fa will be True.
    """
    uc_request = LoginUserRequest(
        email=request.email,
        password=request.password,
        remember_me=request.remember_me,
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
        secure=True,  # HTTPS only
        samesite="strict",  # CSRF protection
    )

    response.set_cookie(
        key="refresh_token",
        value=result.refresh_token,
        expires=refresh_token_expiry,
        httponly=True,
        secure=True,
        samesite="strict",
    )

    # Also set user_data cookie for server components
    response.set_cookie(
        key="user_data",
        value=result.user.model_dump_json(),
        expires=refresh_token_expiry,
        httponly=True,
        secure=True,
        samesite="strict",
    )

    return result


@router.post("/refresh")
async def refresh_token(
    request: RefreshTokenRequest,
    use_case: Annotated[RefreshTokenUseCase, Depends(get_refresh_token_use_case)],
) -> RefreshTokenResponse:
    """
    Refresh access token using refresh token.

    - **refresh_token**: Valid refresh token
    """
    uc_request = RefreshTokenUCRequest(refresh_token=request.refresh_token)
    return await use_case.execute(uc_request)


@router.post("/oauth/{provider}")
async def oauth_login(
    provider: str,
    request: OAuthLoginRequest,
    use_case: Annotated[OAuthLoginUseCase, Depends(get_oauth_login_use_case)],
) -> OAuthLoginResponse:
    """
    OAuth social login (direct).

    This endpoint is for testing and direct OAuth login with pre-fetched user data.
    For browser-based OAuth flow, use /oauth/{provider}/authorize instead.

    Supports Google and Facebook OAuth.
    """
    uc_request = OAuthLoginUCRequest(
        provider=provider,
        provider_user_id=request.provider_user_id,
        email=request.email,
        full_name=request.full_name,
        avatar_url=request.avatar_url,
    )
    return await use_case.execute(uc_request)


@router.get("/oauth/{provider}/authorize")
@rate_limit(AUTH_LIMIT)  # Rate limit: 5 requests per minute per IP
async def oauth_authorize(
    provider: str,
    request: Request,  # noqa: ARG001 - Used by rate_limit decorator
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
    # Use per-provider redirect URI from settings (pre-configured, includes protocol)
    provider_redirect_uris: dict[str, str] = {
        "google": settings.google_oauth_redirect_uri,
        "facebook": settings.facebook_oauth_redirect_uri,
    }
    redirect_uri = provider_redirect_uris.get(provider, "")

    # Initiate OAuth flow: get authorization URL and state token
    result = await oauth_service.initiate_authorization(
        provider=provider,
        redirect_uri=redirect_uri,
    )

    logger.info(
        f"OAuth authorization initiated for provider={provider}, state={result.state_token[:8]}..."
    )

    # Redirect user to OAuth provider authorization page
    return RedirectResponse(url=result.authorization_url, status_code=302)


@router.get("/oauth/{provider}/callback")
@rate_limit(AUTH_LIMIT)  # Rate limit: 5 requests per minute per IP
async def oauth_callback(
    provider: str,
    request: Request,  # noqa: ARG001 - Used by rate_limit decorator
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
    if error:
        logger.warning(f"OAuth callback error for provider={provider}: {error}")
        error_url = f"{settings.oauth_frontend_failure_url}{error}"
        return RedirectResponse(url=error_url, status_code=302)

    # Validate required parameters for successful OAuth flow
    if not code or not state:
        logger.error(
            f"OAuth callback missing required parameters: code={bool(code)}, state={bool(state)}"
        )
        error_url = f"{settings.oauth_frontend_failure_url}invalid_request"
        return RedirectResponse(url=error_url, status_code=302)

    try:
        # Use per-provider redirect URI from settings (must match authorize)
        provider_redirect_uris: dict[str, str] = {
            "google": settings.google_oauth_redirect_uri,
            "facebook": settings.facebook_oauth_redirect_uri,
        }
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
            httponly=True,  # CRITICAL: Prevents JavaScript access (XSS protection)
            secure=True,  # HTTPS only
            samesite="lax",  # Lax required: OAuth redirect chain crosses google.com
        )

        redirect.set_cookie(
            key="refresh_token",
            value=login_result.refresh_token,
            expires=refresh_token_expiry,
            httponly=True,
            secure=True,
            samesite="lax",
        )

        redirect.set_cookie(
            key="user_data",
            value=login_result.user.model_dump_json(),
            expires=refresh_token_expiry,
            httponly=True,
            secure=True,
            samesite="lax",
        )

        logger.info(
            f"User logged in via OAuth: {login_result.user.email}, redirecting to dashboard"
        )

        return redirect

    except HTTPException as e:
        # OAuth flow failed (invalid state, expired code, etc.)
        logger.error(f"OAuth callback HTTP exception for provider={provider}: {e.detail}")
        error_url = f"{settings.oauth_frontend_failure_url}{e.detail}"
        return RedirectResponse(url=error_url, status_code=302)

    except Exception as e:
        # Unexpected error
        logger.exception(f"Unexpected OAuth callback error for provider={provider}: {e}")
        error_url = f"{settings.oauth_frontend_failure_url}internal_error"
        return RedirectResponse(url=error_url, status_code=302)


@router.post("/2fa/enable")
async def enable_2fa(
    request: Enable2FARequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    use_case: Annotated[Enable2FAUseCase, Depends(get_enable_2fa_use_case)],
) -> Enable2FAResponse:
    """
    Enable two-factor authentication.

    Returns TOTP secret, QR code URI, and backup codes.
    Save the backup codes securely!
    """
    # Ensure user can only enable 2FA for themselves
    if current_user["sub"] != str(request.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only enable 2FA for your own account",
        )

    uc_request = Enable2FAUCRequest(user_id=request.user_id)
    return await use_case.execute(uc_request)


@router.post("/2fa/verify")
async def verify_2fa(
    request: Verify2FARequest,
    use_case: Annotated[Verify2FAUseCase, Depends(get_verify_2fa_use_case)],
) -> Verify2FAResponse:
    """
    Verify 2FA code during login.

    Accepts either TOTP code from authenticator app or backup code.
    """
    uc_request = Verify2FAUCRequest(
        user_id=request.user_id,
        code=request.code,
    )
    return await use_case.execute(uc_request)


@router.post("/2fa/disable")
async def disable_2fa(
    request: Disable2FARequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    use_case: Annotated[Disable2FAUseCase, Depends(get_disable_2fa_use_case)],
) -> Disable2FAResponse:
    """
    Disable two-factor authentication.

    Requires a valid TOTP code to confirm.
    """
    # Ensure user can only disable 2FA for themselves
    if current_user["sub"] != str(request.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only disable 2FA for your own account",
        )

    uc_request = Disable2FAUCRequest(
        user_id=request.user_id,
        totp_code=request.totp_code,
    )
    return await use_case.execute(uc_request)


@router.get("/state")
async def get_auth_state(
    current_user: Annotated[dict[str, Any] | None, Depends(get_optional_user)] = None,
) -> JSONResponse:
    """
    Get current authentication state from httpOnly cookies.

    Server Components use this to check auth status without
    exposing tokens to client-side code.

    Returns user data and authentication status based on cookies.
    """
    if not current_user:
        return JSONResponse(
            {
                "isAuthenticated": False,
                "user": None,
            }
        )

    # User is authenticated, return user data
    return JSONResponse(
        {
            "isAuthenticated": True,
            "user": {
                "id": current_user["sub"],
                "email": current_user.get("email"),
                "first_name": current_user.get("first_name"),
                "last_name": current_user.get("last_name"),
                "role": current_user.get("role"),
                "is_email_verified": current_user.get("is_email_verified", False),
                "is_2fa_enabled": current_user.get("is_2fa_enabled", False),
            },
        }
    )


@router.get("/me")
async def get_me(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
) -> dict[str, Any]:
    """
    Get current user info from JWT token.

    Returns basic user information from the access token.
    """
    return {
        "id": current_user["sub"],
        "roles": current_user.get("roles", []),
    }


@router.post("/logout")
async def logout(response: Response) -> LogoutResponse:
    """
    Logout user.

    Clears httpOnly cookies by setting them with expiration in the past.
    """
    # Clear cookies by setting them with expired date
    response.delete_cookie(key="access_token", httponly=True, secure=True, samesite="strict")
    response.delete_cookie(key="refresh_token", httponly=True, secure=True, samesite="strict")
    response.delete_cookie(key="user_data", httponly=True, secure=True, samesite="strict")

    return LogoutResponse(message="Logout successful")
