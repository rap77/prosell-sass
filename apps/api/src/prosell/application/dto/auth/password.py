"""DTOs for password reset."""

from pydantic import BaseModel, EmailStr, Field


class RequestPasswordResetRequest(BaseModel):
    """DTO for password reset request."""

    email: EmailStr


class RequestPasswordResetResponse(BaseModel):
    """DTO for password reset request response."""

    message: str


class ResetPasswordRequest(BaseModel):
    """DTO for password reset."""

    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class ResetPasswordResponse(BaseModel):
    """DTO for password reset response."""

    message: str
