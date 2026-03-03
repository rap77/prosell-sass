"""SQLAlchemy implementation of OAuth repository."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.repositories.oauth_repository import AbstractOAuthRepository
from prosell.infrastructure.models.oauth_account_model import OAuthAccountModel


class SqlAlchemyOAuthRepository(AbstractOAuthRepository):
    """SQLAlchemy implementation of OAuthRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def link_oauth_account(
        self,
        user_id: UUID,
        provider: str,
        provider_user_id: str,
        provider_email: str | None = None,
        access_token: str | None = None,
        refresh_token: str | None = None,
        expires_at: datetime | None = None,
    ) -> None:
        """Link an OAuth account to a user."""
        oauth_account = OAuthAccountModel(
            user_id=user_id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=provider_email,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )
        self.session.add(oauth_account)
        await self.session.flush()

    async def unlink_oauth_account(
        self,
        user_id: UUID,
        provider: str,
    ) -> bool:
        """Unlink an OAuth account from a user."""
        stmt = select(OAuthAccountModel).where(
            OAuthAccountModel.user_id == user_id,
            OAuthAccountModel.provider == provider,
        )
        result = await self.session.execute(stmt)
        oauth_model = result.scalar_one_or_none()

        if not oauth_model:
            return False

        await self.session.delete(oauth_model)
        await self.session.flush()
        return True

    async def get_user_oauth_providers(self, user_id: UUID) -> list[dict[str, object]]:
        """Get all OAuth providers linked to a user."""
        stmt = select(OAuthAccountModel).where(
            OAuthAccountModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [
            {
                "provider": model.provider,
                "provider_user_id": model.provider_user_id,
                "provider_email": model.provider_email,
                "created_at": model.created_at,
            }
            for model in models
        ]
