"""OAuth login use case."""

from dataclasses import dataclass
from datetime import datetime

from prosell.domain.entities.user import User
from prosell.domain.ports import IJWTService
from prosell.domain.repositories.oauth_repository import AbstractOAuthRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository


@dataclass
class OAuthLoginRequest:
    """DTO for OAuth login request."""

    provider: str  # "google" or "facebook"
    provider_user_id: str
    email: str
    full_name: str
    avatar_url: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: datetime | None = None


@dataclass
class OAuthLoginResponse:
    """DTO for OAuth login response."""

    access_token: str
    refresh_token: str
    user: dict


class OAuthLoginUseCase:
    """Use case for OAuth social login."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        oauth_repository: AbstractOAuthRepository,
        jwt_service: IJWTService,
    ) -> None:
        self.user_repository = user_repository
        self.oauth_repository = oauth_repository
        self.jwt_service = jwt_service

    async def execute(self, request: OAuthLoginRequest) -> OAuthLoginResponse:
        """
        Execute OAuth login.

        Args:
            request: OAuth login request DTO

        Returns:
            Login response DTO
        """
        # 1. Check if user exists with this OAuth provider
        existing_user = await self.user_repository.get_by_oauth(
            provider=request.provider,
            provider_user_id=request.provider_user_id,
        )

        if existing_user:
            # Update last login
            existing_user.update_last_login()
            await self.user_repository.update(existing_user)
            user = existing_user
        else:
            # Check if user exists with this email (link accounts)
            email_user = await self.user_repository.get_by_email(request.email)

            if email_user:
                # Link OAuth account to existing user
                await self.oauth_repository.link_oauth_account(
                    user_id=email_user.id,
                    provider=request.provider,
                    provider_user_id=request.provider_user_id,
                    provider_email=request.email,
                    access_token=request.access_token,
                    refresh_token=request.refresh_token,
                    expires_at=request.expires_at,
                )
                user = email_user
            else:
                # Create new user from OAuth
                user = User.create_oauth(
                    email=request.email,
                    full_name=request.full_name,
                    avatar_url=request.avatar_url,
                )
                user = await self.user_repository.create(user)

                # Link OAuth account to new user
                await self.oauth_repository.link_oauth_account(
                    user_id=user.id,
                    provider=request.provider,
                    provider_user_id=request.provider_user_id,
                    provider_email=request.email,
                    access_token=request.access_token,
                    refresh_token=request.refresh_token,
                    expires_at=request.expires_at,
                )

        # 2. Get user roles (default to VIEWER for new OAuth users)
        user_roles = await self.user_repository.get_user_roles(user.id)
        if not user_roles:
            user_roles = ["viewer"]

        # 3. Generate tokens
        access_token = self.jwt_service.generate_access_token(user.id, user_roles)
        refresh_token = self.jwt_service.generate_refresh_token(user.id)

        return OAuthLoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "roles": user_roles,
            },
        )
