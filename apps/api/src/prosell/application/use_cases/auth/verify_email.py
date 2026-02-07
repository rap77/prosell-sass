"""Email verification use case."""

from dataclasses import dataclass

from prosell.domain.repositories.user_repository import AbstractUserRepository


@dataclass
class VerifyEmailRequest:
    """DTO for email verification request."""

    token: str


@dataclass
class VerifyEmailResponse:
    """DTO for email verification response."""

    success: bool
    message: str


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
            InvalidCredentialsException: If token is invalid
        """
        # TODO: Implement actual token verification
        # For now, this is a placeholder
        return VerifyEmailResponse(
            success=True,
            message="Email verified successfully",
        )
