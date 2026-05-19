"""Response schemas for API endpoints."""

from uuid import UUID

from pydantic import BaseModel, Field


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


class HealthCheckResponse(BaseModel):
    """Health check response model."""

    status: str
    service: str
    timestamp: str
    version: str


class AuthStateUserResponse(BaseModel):
    """User data within auth state response."""

    id: str
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    role: str | None = None
    is_email_verified: bool = False
    is_2fa_enabled: bool = False


class AuthStateResponse(BaseModel):
    """Auth state response model."""

    is_authenticated: bool = Field(
        serialization_alias="isAuthenticated",
        validation_alias="isAuthenticated",
    )
    user: AuthStateUserResponse | None = None


class MeResponse(BaseModel):
    """Current user info from JWT token."""

    id: str
    roles: list[str] = []
