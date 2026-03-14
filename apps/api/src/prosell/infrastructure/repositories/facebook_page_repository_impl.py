"""SQLAlchemy implementation of Facebook Page repository."""

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.facebook_page import FacebookPage
from prosell.domain.exceptions.facebook_exceptions import FacebookPageNotFoundException
from prosell.domain.repositories.facebook_page_repository import IFacebookPageRepository
from prosell.infrastructure.models.facebook_account_model import FacebookPageModel


class SqlAlchemyFacebookPageRepository(IFacebookPageRepository):
    """SQLAlchemy implementation of Facebook Page repository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, page: FacebookPage) -> FacebookPage:
        """Create a new Facebook page."""
        model = FacebookPageModel(
            id=page.id,
            facebook_account_id=page.facebook_account_id,
            page_id=page.page_id,
            page_name=page.page_name,
            page_access_token_encrypted=page.page_access_token_encrypted,
            category=page.category,
            picture_url=page.picture_url,
            is_default=page.is_default,
            created_at=page.created_at,
            updated_at=page.updated_at,
        )

        self.session.add(model)
        await self.session.flush()

        return self._model_to_entity(model)

    async def get_by_id(self, page_id: UUID) -> FacebookPage | None:
        """Get Facebook page by ID."""
        stmt = select(FacebookPageModel).where(FacebookPageModel.id == page_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return None

        return self._model_to_entity(model)

    async def get_by_facebook_account_id(
        self,
        facebook_account_id: UUID,
    ) -> list[FacebookPage]:
        """Get all pages for a Facebook account."""
        stmt = select(FacebookPageModel).where(
            FacebookPageModel.facebook_account_id == facebook_account_id
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self._model_to_entity(m) for m in models]

    async def get_by_facebook_page_id(
        self,
        facebook_page_id: str,
    ) -> FacebookPage | None:
        """Get Facebook page by Facebook page ID."""
        stmt = select(FacebookPageModel).where(FacebookPageModel.page_id == facebook_page_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return None

        return self._model_to_entity(model)

    async def update(self, page: FacebookPage) -> FacebookPage:
        """Update Facebook page."""
        stmt = select(FacebookPageModel).where(FacebookPageModel.id == page.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise FacebookPageNotFoundException(str(page.id))

        # Update fields
        model.page_access_token_encrypted = page.page_access_token_encrypted
        model.category = page.category
        model.picture_url = page.picture_url
        model.is_default = page.is_default
        model.updated_at = page.updated_at

        await self.session.flush()

        return self._model_to_entity(model)

    async def delete(self, page_id: UUID) -> None:
        """Delete Facebook page."""
        stmt = select(FacebookPageModel).where(FacebookPageModel.id == page_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise FacebookPageNotFoundException(str(page_id))

        await self.session.delete(model)
        await self.session.flush()

    async def delete_by_facebook_account_id(
        self,
        facebook_account_id: UUID,
    ) -> int:
        """Delete all pages for a Facebook account."""
        stmt = select(FacebookPageModel).where(
            FacebookPageModel.facebook_account_id == facebook_account_id
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        count = len(models)
        for model in models:
            await self.session.delete(model)

        await self.session.flush()
        return count

    async def get_default_page(
        self,
        facebook_account_id: UUID,
    ) -> FacebookPage | None:
        """Get default page for a Facebook account."""
        stmt = select(FacebookPageModel).where(
            FacebookPageModel.facebook_account_id == facebook_account_id,
            FacebookPageModel.is_default == True,  # noqa: E712
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return None

        return self._model_to_entity(model)

    async def set_default_page(
        self,
        facebook_account_id: UUID,
        page_id: UUID,
    ) -> None:
        """Set default page for a Facebook account.

        Unsets is_default on all other pages for this account.
        """
        # Unset all pages
        await self.session.execute(
            update(FacebookPageModel)
            .where(FacebookPageModel.facebook_account_id == facebook_account_id)
            .values(is_default=False)
        )

        # Set new default
        await self.session.execute(
            update(FacebookPageModel).where(FacebookPageModel.id == page_id).values(is_default=True)
        )

        await self.session.flush()

    def _model_to_entity(self, model: FacebookPageModel) -> FacebookPage:
        """Convert SQLAlchemy model to domain entity."""
        return FacebookPage(
            id=model.id,
            facebook_account_id=model.facebook_account_id,
            page_id=model.page_id,
            page_name=model.page_name,
            page_access_token_encrypted=model.page_access_token_encrypted,
            category=model.category,
            picture_url=model.picture_url,
            is_default=model.is_default,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
