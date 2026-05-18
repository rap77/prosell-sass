"""DTOs for current-user profile operations."""

from pydantic import BaseModel, EmailStr, Field


class UpdateCurrentUserProfileRequest(BaseModel):
    """Request DTO for updating the authenticated user's profile."""

    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr


class CurrentUserProfileResponse(BaseModel):
    """Response DTO for the authenticated user's profile."""

    id: str
    email: EmailStr
    full_name: str
    tenant_id: str | None = None
