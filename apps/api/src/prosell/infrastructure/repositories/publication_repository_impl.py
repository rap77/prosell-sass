"""SQLAlchemy implementation of IPublicationRepository."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.publication import (
    Publication,
    PublicationErrorCategory,
    PublicationStatus,
)
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.infrastructure.models.publication_model import PublicationModel


class SqlAlchemyPublicationRepository(IPublicationRepository):
    """SQLAlchemy implementation of the Publication repository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, publication: Publication) -> Publication:
        """Persist a new publication."""
        model = self._to_model(publication)
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, publication_id: UUID) -> Publication | None:
        """Get publication by primary key."""
        stmt = select(PublicationModel).where(PublicationModel.id == publication_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_product_id(self, product_id: UUID) -> list[Publication]:
        """Get all publications for a product (full history)."""
        stmt = (
            select(PublicationModel)
            .where(PublicationModel.product_id == product_id)
            .order_by(PublicationModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def get_active_by_seller(self, seller_user_id: UUID) -> list[Publication]:
        """Get PUBLISHED publications for a seller."""
        stmt = select(PublicationModel).where(
            PublicationModel.seller_user_id == seller_user_id,
            PublicationModel.status == PublicationStatus.PUBLISHED.value,
        )
        result = await self.session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def get_approaching_expiry(self, hours_before: int = 48) -> list[Publication]:
        """Get PUBLISHED listings expiring within the warning window.

        Used by the scheduler to trigger republication before FB removes listings.
        """
        threshold = datetime.now(UTC) + timedelta(hours=hours_before)
        stmt = select(PublicationModel).where(
            PublicationModel.status == PublicationStatus.PUBLISHED.value,
            PublicationModel.expires_at < threshold,
        )
        result = await self.session.execute(stmt)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def update(self, publication: Publication) -> Publication:
        """Update an existing publication."""
        stmt = select(PublicationModel).where(PublicationModel.id == publication.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            msg = f"Publication {publication.id} not found"
            raise ValueError(msg)

        # Update all mutable fields
        model.status = publication.status.value
        model.strategy_used = publication.strategy_used
        model.engine_version = publication.engine_version
        model.fb_listing_id = publication.fb_listing_id
        model.title = publication.title
        model.description = publication.description
        model.price_cents = publication.price_cents
        model.zip_code = publication.zip_code
        model.image_urls = publication.image_urls
        model.hero_shot_url = publication.hero_shot_url
        model.published_at = publication.published_at
        model.expires_at = publication.expires_at
        model.sold_at = publication.sold_at
        model.error_category = (
            publication.error_category.value if publication.error_category else None
        )
        model.error_message = publication.error_message
        model.error_detail = publication.error_detail
        model.retry_count = publication.retry_count
        model.last_retry_at = publication.last_retry_at
        model.blocked_until_confirmed = publication.blocked_until_confirmed
        model.updated_at = publication.updated_at

        await self.session.flush()
        return self._to_entity(model)

    # ==================== Mapper Helpers ====================

    def _to_entity(self, model: PublicationModel) -> Publication:
        """Convert SQLAlchemy model to domain entity."""
        return Publication(
            id=model.id,
            product_id=model.product_id,
            tenant_id=model.tenant_id,
            seller_user_id=model.seller_user_id,
            facebook_page_id=model.facebook_page_id,
            status=PublicationStatus(model.status),
            strategy_used=model.strategy_used,
            engine_version=model.engine_version,
            fb_listing_id=model.fb_listing_id,
            title=model.title,
            description=model.description,
            price_cents=model.price_cents,
            zip_code=model.zip_code,
            image_urls=model.image_urls or [],
            hero_shot_url=model.hero_shot_url,
            published_at=model.published_at,
            expires_at=model.expires_at,
            sold_at=model.sold_at,
            error_category=(
                PublicationErrorCategory(model.error_category) if model.error_category else None
            ),
            error_message=model.error_message,
            error_detail=model.error_detail,
            retry_count=model.retry_count,
            last_retry_at=model.last_retry_at,
            blocked_until_confirmed=model.blocked_until_confirmed,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, publication: Publication) -> PublicationModel:
        """Convert domain entity to SQLAlchemy model."""
        return PublicationModel(
            id=publication.id,
            product_id=publication.product_id,
            tenant_id=publication.tenant_id,
            seller_user_id=publication.seller_user_id,
            facebook_page_id=publication.facebook_page_id,
            status=publication.status.value,
            strategy_used=publication.strategy_used,
            engine_version=publication.engine_version,
            fb_listing_id=publication.fb_listing_id,
            title=publication.title,
            description=publication.description,
            price_cents=publication.price_cents,
            zip_code=publication.zip_code,
            image_urls=publication.image_urls,
            hero_shot_url=publication.hero_shot_url,
            published_at=publication.published_at,
            expires_at=publication.expires_at,
            sold_at=publication.sold_at,
            error_category=publication.error_category.value if publication.error_category else None,
            error_message=publication.error_message,
            error_detail=publication.error_detail,
            retry_count=publication.retry_count,
            last_retry_at=publication.last_retry_at,
            blocked_until_confirmed=publication.blocked_until_confirmed,
            created_at=publication.created_at,
            updated_at=publication.updated_at,
        )
