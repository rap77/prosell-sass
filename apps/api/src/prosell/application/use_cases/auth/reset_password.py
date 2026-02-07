"""Password reset use case."""

from dataclasses import dataclass

from prosell.application.ports.email_service import AbstractEmailService
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.infrastructure.services.password_service import PasswordService


@dataclass
class RequestPasswordResetRequest:
    """DTO for password reset request."""

    email: str


@dataclass
class RequestPasswordResetResponse:
    """DTO for password reset request response."""

    message: str


@dataclass
class ResetPasswordRequest:
    """DTO for password reset."""

    token: str
    new_password: str


@dataclass
class ResetPasswordResponse:
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
            # TODO: Generate actual reset token
            reset_token = "temp_token"
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
        password_service: PasswordService,
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
            ValueError: If token is invalid
        """
        # TODO: Implement actual token verification
        # For now, this is a placeholder
        return ResetPasswordResponse(
            message="Password reset successfully",
        )
