"""DTOs for token refresh."""

from pydantic import BaseModel, Field


class RefreshTokenRequest(BaseModel):
    """DTO for token refresh request."""

    refresh_token: str = Field(min_length=1)


class RefreshTokenResponse(BaseModel):
    """DTO for token refresh response."""

    access_token: str
    refresh_token: str
