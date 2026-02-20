"""Response schemas for API endpoints."""

from uuid import UUID

from pydantic import BaseModel


class UserResponse(BaseModel):
    """User response model."""

    id: UUID
    email: str
    full_name: str
    status: str
    is_email_verified: bool
    has_2fa: bool


class AuthTokenResponse(BaseModel):
    """Auth token response model."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Generic message response model."""

    message: str
    status: str = "success"


class LogoutResponse(BaseModel):
    """Logout response model."""

    message: str
