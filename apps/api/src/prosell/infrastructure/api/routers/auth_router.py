"""Authentication router for ProSell SaaS API."""

from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse

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

# NOTE: Per-endpoint rate limiting is tracked in GitHub issue security-123
# Rate limiting middleware is implemented but not yet enabled for auth endpoints
# This is intentionally disabled during development to avoid lockout during testing
#
# To enable when ready:
# from prosell.infrastructure.api.middleware import auth_limits, api_limits
#
# Then add @auth_limits decorator to sensitive endpoints:
# - @router.post("/login") -> @auth_limits(...)
# - @router.post("/register") -> @auth_limits(...)
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
from prosell.infrastructure.api.dependencies import (
    get_disable_2fa_use_case,
    get_enable_2fa_use_case,
    get_login_user_use_case,
    get_oauth_login_use_case,
    get_refresh_token_use_case,
    get_register_user_use_case,
    get_verify_2fa_use_case,
)
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
    OAuth social login.

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
