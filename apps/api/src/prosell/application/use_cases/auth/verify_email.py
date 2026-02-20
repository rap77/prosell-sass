"""Email verification use case."""

from prosell.application.dto.auth import VerifyEmailRequest, VerifyEmailResponse
from prosell.domain.repositories.user_repository import AbstractUserRepository


class VerifyEmailUseCase:
    """Use case for email verification."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
    ) -> None:
        self.user_repository = user_repository

    async def execute(self, request: VerifyEmailRequest) -> VerifyEmailResponse:
        """
        Execute email verification.

        Args:
            request: Verification request DTO

        Returns:
            Verification response DTO

        Raises:
            ValueError: If token is invalid or expired
        """
        # 1. Get user by verification token
        user = await self.user_repository.get_by_verification_token(request.token)

        if not user:
            raise ValueError("Invalid or expired verification token")

        # 2. Mark email as verified
        user.verify_email()

        # 3. Consume the token (marks as used)
        await self.user_repository.consume_token(request.token)

        # 4. Update user in database
        await self.user_repository.update(user)

        return VerifyEmailResponse(
            success=True,
            message="Email verified successfully",
        )
