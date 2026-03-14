"""SQLAlchemy implementation of Facebook Account repository."""

import json
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.facebook_account import FacebookAccount, FacebookAccountStatus
from prosell.domain.exceptions.facebook_exceptions import FacebookAccountNotFoundException
from prosell.domain.repositories.facebook_account_repository import IFacebookAccountRepository
from prosell.infrastructure.models.facebook_account_model import FacebookAccountModel


class SqlAlchemyFacebookAccountRepository(IFacebookAccountRepository):
    """SQLAlchemy implementation of Facebook Account repository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, account: FacebookAccount) -> FacebookAccount:
        """Create a new Facebook account connection."""
        # Convert scopes list to JSON string
        scopes_json = json.dumps(account.scopes)

        model = FacebookAccountModel(
            id=account.id,
            seller_user_id=account.seller_user_id,
            facebook_user_id=account.facebook_user_id,
            facebook_name=account.facebook_name,
            access_token_encrypted=account.access_token_encrypted,
            token_expires_at=account.token_expires_at,
            scopes=scopes_json,
            status=account.status.value,
            refresh_failure_count=account.refresh_failure_count,
            created_at=account.created_at,
            updated_at=account.updated_at,
        )

        self.session.add(model)
        await self.session.flush()

        # Return entity with model values
        return self._model_to_entity(model)

    async def get_by_id(self, account_id: UUID) -> FacebookAccount | None:
        """Get Facebook account by ID."""
        stmt = select(FacebookAccountModel).where(FacebookAccountModel.id == account_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return None

        return self._model_to_entity(model)

    async def get_by_seller_user_id(
        self,
        seller_user_id: UUID,
    ) -> list[FacebookAccount]:
        """Get all Facebook accounts for a vendedor."""
        stmt = select(FacebookAccountModel).where(
            FacebookAccountModel.seller_user_id == seller_user_id
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self._model_to_entity(m) for m in models]

    async def get_by_facebook_user_id(
        self,
        facebook_user_id: str,
    ) -> FacebookAccount | None:
        """Get Facebook account by Facebook user ID."""
        stmt = select(FacebookAccountModel).where(
            FacebookAccountModel.facebook_user_id == facebook_user_id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return None

        return self._model_to_entity(model)

    async def update(self, account: FacebookAccount) -> FacebookAccount:
        """Update Facebook account."""
        stmt = select(FacebookAccountModel).where(FacebookAccountModel.id == account.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise FacebookAccountNotFoundException(str(account.id))

        # Update fields
        model.access_token_encrypted = account.access_token_encrypted
        model.token_expires_at = account.token_expires_at
        model.status = account.status.value
        model.scopes = json.dumps(account.scopes)
        model.refresh_failure_count = account.refresh_failure_count
        model.updated_at = account.updated_at

        await self.session.flush()

        return self._model_to_entity(model)

    async def delete(self, account_id: UUID) -> None:
        """Delete Facebook account."""
        stmt = select(FacebookAccountModel).where(FacebookAccountModel.id == account_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise FacebookAccountNotFoundException(str(account_id))

        await self.session.delete(model)
        await self.session.flush()

    async def get_accounts_expiring_before(
        self,
        threshold: datetime,
    ) -> list[FacebookAccount]:
        """Get accounts expiring before threshold."""
        stmt = select(FacebookAccountModel).where(
            FacebookAccountModel.token_expires_at < threshold,
            FacebookAccountModel.status == FacebookAccountStatus.ACTIVE.value,
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self._model_to_entity(m) for m in models]

    async def exists_by_facebook_user_id(
        self,
        facebook_user_id: str,
    ) -> bool:
        """Check if Facebook account exists by Facebook user ID."""
        stmt = select(FacebookAccountModel.id).where(
            FacebookAccountModel.facebook_user_id == facebook_user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    def _model_to_entity(self, model: FacebookAccountModel) -> FacebookAccount:
        """Convert SQLAlchemy model to domain entity."""
        scopes = json.loads(model.scopes) if model.scopes else []

        return FacebookAccount(
            id=model.id,
            seller_user_id=model.seller_user_id,
            facebook_user_id=model.facebook_user_id,
            facebook_name=model.facebook_name,
            access_token_encrypted=model.access_token_encrypted,
            token_expires_at=model.token_expires_at,
            scopes=scopes,
            status=FacebookAccountStatus(model.status),
            refresh_failure_count=model.refresh_failure_count,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
