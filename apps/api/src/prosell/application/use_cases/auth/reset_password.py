"""Password reset use case."""

import secrets

from pydantic import BaseModel, EmailStr, Field

from prosell.application.ports.email_service import AbstractEmailService
from prosell.domain.ports import IPasswordService
from prosell.domain.repositories.user_repository import AbstractUserRepository


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


class RequestPasswordResetUseCase:
    """Use case for requesting password reset."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        email_service: AbstractEmailService,
    ) -> None:
        self.user_repository = user_repository
        self.email_service = email_service

    async def execute(
        self,
        request: RequestPasswordResetRequest,
    ) -> RequestPasswordResetResponse:
        """
        Execute password reset request.

        Always returns success message (security best practice).
        """
        # 1. Get user by email
        user = await self.user_repository.get_by_email(request.email)

        # 2. If user exists, send reset email
        if user:
            # Generate secure random token for password reset
            reset_token = secrets.token_urlsafe(32)

            # Store token in database for verification
            await self.user_repository.create_verification_token(
                user_id=user.id,
                token=reset_token,
                token_type="password_reset",
                expires_in_minutes=60,  # 1 hour expiration
            )

            await self.email_service.send_password_reset(user.email, reset_token)

        # 3. Always return success (don't reveal if email exists)
        return RequestPasswordResetResponse(
            message="If an account exists with that email, a password reset link has been sent.",
        )


class ResetPasswordUseCase:
    """Use case for resetting password."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        password_service: IPasswordService,
    ) -> None:
        self.user_repository = user_repository
        self.password_service = password_service

    async def execute(self, request: ResetPasswordRequest) -> ResetPasswordResponse:
        """
        Execute password reset.

        Args:
            request: Password reset request DTO

        Returns:
            Reset response DTO

        Raises:
            ValueError: If token is invalid or expired
        """
        # Note: This requires the token to contain or be associated with user_id.
        # The current implementation of consume_token only returns bool.
        #
        # TODO: Refactor create_verification_token to return (token, user_id) mapping
        # TODO: Add method to get user_id from token before consuming it
        #
        # For now, this is a placeholder that indicates the feature needs completion.
        raise NotImplementedError(
            "Password reset requires retrieving user_id from token. "
            "The repository layer needs to support: get_user_by_token(token) -> User"
        )
