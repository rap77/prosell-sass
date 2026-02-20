"""DTOs for email verification."""

from pydantic import BaseModel, Field


class VerifyEmailRequest(BaseModel):
    """DTO for email verification request."""

    token: str = Field(min_length=1)


class VerifyEmailResponse(BaseModel):
    """DTO for email verification response."""

    success: bool
    message: str
