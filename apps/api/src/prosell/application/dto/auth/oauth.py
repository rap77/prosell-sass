"""DTOs for OAuth login."""

from datetime import datetime

from pydantic import BaseModel, EmailStr

from prosell.application.dto.auth.common import UserInfo


class OAuthLoginRequest(BaseModel):
    """DTO for OAuth login request."""

    provider: str  # "google" or "facebook"
    provider_user_id: str
    email: EmailStr
    full_name: str
    avatar_url: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: datetime | None = None


class OAuthLoginResponse(BaseModel):
    """DTO for OAuth login response."""

    access_token: str
    refresh_token: str
    user: UserInfo
