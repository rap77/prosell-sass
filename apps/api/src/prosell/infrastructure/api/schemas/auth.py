"""Request schemas for authentication endpoints."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    """Registration request model."""

    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    accept_terms: Literal[True]


class LoginRequest(BaseModel):
    """Login request model."""

    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str
    remember_me: bool = False


class RefreshTokenRequest(BaseModel):
    """Refresh token request model."""

    refresh_token: str


class ChangePasswordRequest(BaseModel):
    """Authenticated password change request model."""

    model_config = ConfigDict(str_strip_whitespace=True)

    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class Enable2FARequest(BaseModel):
    """Enable 2FA request model."""


class Verify2FARequest(BaseModel):
    """Verify 2FA request model."""

    code: str = Field(..., min_length=6, max_length=6)


class Disable2FARequest(BaseModel):
    """Disable 2FA request model."""

    totp_code: str = Field(..., min_length=6, max_length=6)


class OAuthLoginRequest(BaseModel):
    """OAuth login request model."""

    provider_user_id: str
    email: EmailStr
    full_name: str
    avatar_url: str | None = None
