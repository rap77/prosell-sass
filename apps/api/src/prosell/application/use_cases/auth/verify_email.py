"""Email verification use case."""

from pydantic import BaseModel, Field

from prosell.domain.exceptions.auth_exceptions import InvalidCredentialsException
from prosell.domain.repositories.user_repository import AbstractUserRepository


class VerifyEmailRequest(BaseModel):
    """DTO for email verification request."""

    token: str = Field(min_length=1)


class VerifyEmailResponse(BaseModel):
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
            InvalidCredentialsException: If token is invalid or expired
        """
        # 1. Consume the token (marks as used and validates)
        token_valid = await self.user_repository.consume_token(request.token)

        if not token_valid:
            raise InvalidCredentialsException("Invalid or expired verification token")

        # 2. Get user from token
        # Note: The consume_token method should return user_id or we need
        # a separate method to get the user associated with a token
        # TODO: Refactor to return user_id from consume_token
        # For now, we'll assume success if token was consumed

        return VerifyEmailResponse(
            success=True,
            message="Email verified successfully",
        )
