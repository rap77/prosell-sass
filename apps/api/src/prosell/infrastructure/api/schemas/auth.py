"""Request schemas for authentication endpoints."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    """Registration request model."""

    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    accept_terms: bool = True


class LoginRequest(BaseModel):
    """Login request model."""

    model_config = ConfigDict(str_strip_whitespace=True)

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
