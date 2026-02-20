"""DTOs for user login."""

from pydantic import BaseModel, EmailStr, Field

from prosell.application.dto.auth.common import UserInfo


class LoginUserRequest(BaseModel):
    """DTO for login request."""

    email: EmailStr
    password: str = Field(min_length=1)
    remember_me: bool = False
    ip_address: str | None = None
    user_agent: str | None = None


class LoginUserResponse(BaseModel):
    """DTO for login response."""

    access_token: str
    refresh_token: str
    user: UserInfo
    requires_2fa: bool = False
