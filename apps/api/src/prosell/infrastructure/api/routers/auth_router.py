"""Authentication router for ProSell SaaS API."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

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

# TODO: Enable per-endpoint rate limiting
# from prosell.infrastructure.api.middleware import auth_limits, api_limits
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
from prosell.infrastructure.api.middleware.auth_middleware import get_current_user

router = APIRouter()


# =============================================================================
# PYDANTIC MODELS FOR API
# =============================================================================


class RegisterRequest(BaseModel):
    """Registration request model."""

    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    accept_terms: bool = True


class LoginRequest(BaseModel):
    """Login request model."""

    email: EmailStr
    password: str
    remember_me: bool = False


class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""

    refresh_token: str


class Enable2FARequest(BaseModel):
    """Enable 2FA request model."""

    user_id: UUID


class Verify2FARequest(BaseModel):
    """Verify 2FA request model."""

    user_id: UUID
    code: str = Field(..., min_length=6, max_length=6)


class Disable2FARequest(BaseModel):
    """Disable 2FA request model."""

    user_id: UUID
    totp_code: str = Field(..., min_length=6, max_length=6)


class OAuthLoginRequest(BaseModel):
    """OAuth login request model."""

    provider: str = Field(..., pattern="^(google|facebook)$")
    provider_user_id: str
    email: EmailStr
    full_name: str
    avatar_url: str | None = None


class LogoutResponse(BaseModel):
    """Logout response model."""

    message: str


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
    """
    uc_request = RegisterUserRequest(
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        accept_terms=request.accept_terms,
    )
    return await use_case.execute(uc_request)


@router.post("/login")
async def login(
    request: LoginRequest,
    use_case: Annotated[LoginUserUseCase, Depends(get_login_user_use_case)],
) -> LoginUserResponse:
    """
    User login.

    Returns access and refresh tokens.
    If 2FA is enabled, requires_2fa will be True.
    """
    uc_request = LoginUserRequest(
        email=request.email,
        password=request.password,
        remember_me=request.remember_me,
    )
    return await use_case.execute(uc_request)


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
    current_user: Annotated[dict, Depends(get_current_user)],
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
    current_user: Annotated[dict, Depends(get_current_user)],
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


@router.get("/me")
async def get_me(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    """
    Get current user info from JWT token.

    Returns basic user information from the access token.
    """
    return {
        "id": current_user["sub"],
        "roles": current_user.get("roles", []),
    }


@router.post("/logout")
async def logout() -> LogoutResponse:
    """
    Logout user.

    Note: In a stateless JWT system, logout is handled client-side
    by deleting the tokens. Server-side session revocation would
    require maintaining a blacklist or using refresh tokens.
    """
    return LogoutResponse(message="Logout successful. Please delete your tokens.")
