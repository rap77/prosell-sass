"""DTOs for user registration."""

from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterUserRequest(BaseModel):
    """DTO for user registration request."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=100)
    accept_terms: bool

    @field_validator("accept_terms")
    @classmethod
    def must_accept_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Must accept terms and conditions")
        return v


class RegisterUserResponse(BaseModel):
    """DTO for registration response."""

    user_id: UUID
    email: str
    status: str
    message: str
