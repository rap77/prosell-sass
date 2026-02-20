"""User registration use case."""

import secrets
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from prosell.application.ports.email_service import AbstractEmailService
from prosell.domain.entities.user import User
from prosell.domain.exceptions.auth_exceptions import (
    EmailAlreadyExistsException,
    WeakPasswordException,
)
from prosell.domain.ports import IPasswordService
from prosell.domain.repositories.user_repository import AbstractUserRepository


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


class RegisterUserUseCase:
    """Use case for user registration."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        password_service: IPasswordService,
        email_service: AbstractEmailService,
    ) -> None:
        self.user_repository = user_repository
        self.password_service = password_service
        self.email_service = email_service

    async def execute(self, request: RegisterUserRequest) -> RegisterUserResponse:
        """
        Execute user registration.

        Args:
            request: Registration request DTO

        Returns:
            Registration response DTO

        Raises:
            ValueError: If terms not accepted
            EmailAlreadyExistsException: If email already exists
            WeakPasswordException: If password doesn't meet requirements
        """
        # 1. Check if email already exists
        existing = await self.user_repository.get_by_email(request.email)
        if existing:
            raise EmailAlreadyExistsException(request.email)

        # 3. Validate password strength
        password_errors = self.password_service.validate_password_strength(request.password)
        if password_errors:
            raise WeakPasswordException(reasons=password_errors)

        # 4. Hash password
        password_hash = self.password_service.hash_password(request.password)

        # 5. Create user entity
        user = User.create(
            email=request.email,
            password_hash=password_hash,
            full_name=request.full_name,
        )

        # 6. Save to database
        user = await self.user_repository.create(user)

        # 7. Generate verification token and send email
        verification_token = secrets.token_urlsafe(32)

        # Store token in database for verification
        await self.user_repository.create_verification_token(
            user_id=user.id,
            token=verification_token,
            token_type="email_verification",
            expires_in_minutes=60,  # 1 hour expiration
        )

        await self.email_service.send_verification_email(
            user.email,
            user.id,
            verification_token,
        )

        return RegisterUserResponse(
            user_id=user.id,
            email=user.email,
            status=user.status.value,
            message="Registration successful. Please check your email to verify your account.",
        )
