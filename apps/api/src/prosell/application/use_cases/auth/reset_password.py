"""Password reset use case."""

import secrets

from prosell.application.dto.auth import (
    RequestPasswordResetRequest,
    RequestPasswordResetResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from prosell.application.ports.email_service import AbstractEmailService
from prosell.domain.ports import IPasswordService
from prosell.domain.repositories.user_repository import AbstractUserRepository


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
        # 1. Get user by password reset token
        user = await self.user_repository.get_by_password_reset_token(request.token)

        if not user:
            raise ValueError("Invalid or expired reset token")

        # 2. Hash the new password
        password_hash = self.password_service.hash_password(request.new_password)

        # 3. Update user password
        user.update_password(password_hash)

        # 4. Consume the token (marks as used)
        await self.user_repository.consume_token(request.token)

        # 5. Update user in database
        await self.user_repository.update(user)

        return ResetPasswordResponse(
            message="Password reset successfully",
        )
