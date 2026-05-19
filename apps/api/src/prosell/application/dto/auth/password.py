"""DTOs for password flows."""

from prosell.domain.base import DomainModel, EmailStr, Field


class RequestPasswordResetRequest(DomainModel):
    """DTO for password reset request."""

    email: EmailStr


class RequestPasswordResetResponse(DomainModel):
    """DTO for password reset request response."""

    message: str


class ResetPasswordRequest(DomainModel):
    """DTO for password reset."""

    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class ResetPasswordResponse(DomainModel):
    """DTO for password reset response."""

    message: str


class ChangePasswordRequest(DomainModel):
    """DTO for authenticated password changes."""

    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class ChangePasswordResponse(DomainModel):
    """DTO for authenticated password changes response."""

    message: str
