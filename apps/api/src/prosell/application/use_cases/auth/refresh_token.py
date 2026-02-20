"""Token refresh use case."""

from uuid import UUID

from pydantic import BaseModel, Field

from prosell.domain.ports import IJWTService, ITokenHasher
from prosell.domain.repositories.session_repository import AbstractSessionRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository


class RefreshTokenRequest(BaseModel):
    """DTO for token refresh request."""

    refresh_token: str = Field(min_length=1)


class RefreshTokenResponse(BaseModel):
    """DTO for token refresh response."""

    access_token: str
    refresh_token: str


class RefreshTokenUseCase:
    """Use case for refreshing access tokens."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        session_repository: AbstractSessionRepository,
        jwt_service: IJWTService,
        token_hasher: ITokenHasher,
    ) -> None:
        self.user_repository = user_repository
        self.session_repository = session_repository
        self.jwt_service = jwt_service
        self.token_hasher = token_hasher

    async def execute(self, request: RefreshTokenRequest) -> RefreshTokenResponse:
        """
        Execute token refresh.

        Args:
            request: Refresh token request DTO

        Returns:
            New token response DTO

        Raises:
            ValueError: If token is invalid or expired
        """
        # 1. Verify refresh token
        try:
            payload = self.jwt_service.verify_token(request.refresh_token)
        except ValueError as e:
            raise ValueError("Invalid refresh token") from e

        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")

        user_id = UUID(payload["sub"])

        # 2. Check if session exists and is valid
        token_hash = self.token_hasher.hash(request.refresh_token)
        session = await self.session_repository.get_by_token_hash(token_hash)

        if not session or not session.is_valid():
            raise ValueError("Invalid or expired session")

        # 3. Get user and roles
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        user_roles = await self.user_repository.get_user_roles(user.id)

        # 4. Generate new tokens
        access_token = self.jwt_service.generate_access_token(user.id, user_roles)
        refresh_token = self.jwt_service.generate_refresh_token(user.id)

        # 5. Update session with new token hash
        # (In a full implementation, we'd revoke the old session)

        return RefreshTokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )
