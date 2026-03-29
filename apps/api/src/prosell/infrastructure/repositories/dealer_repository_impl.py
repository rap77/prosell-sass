"""SqlAlchemyDealerRepository implementation."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.dealer import Dealer
from prosell.domain.repositories.dealer_repository import AbstractDealerRepository
from prosell.infrastructure.models.dealer_model import DealerModel


class SqlAlchemyDealerRepository(AbstractDealerRepository):
    """SQLAlchemy implementation of AbstractDealerRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, dealer: Dealer) -> Dealer:
        """Create a new dealer."""
        model = self._to_model(dealer)
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, dealer_id: UUID, tenant_id: UUID) -> Dealer | None:
        """Get dealer by ID with tenant isolation."""
        stmt = select(DealerModel).where(
            DealerModel.id == dealer_id,
            DealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_slug(self, slug: str, tenant_id: UUID) -> Dealer | None:
        """Get dealer by slug (unique per tenant)."""
        stmt = select(DealerModel).where(
            DealerModel.slug == slug,
            DealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def exists_by_slug(self, slug: str, tenant_id: UUID) -> bool:
        """Check if slug exists (for validation)."""
        stmt = select(func.count(DealerModel.id)).where(
            DealerModel.slug == slug,
            DealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0
        return count > 0

    async def update(self, dealer: Dealer) -> Dealer:
        """Update an existing dealer."""
        stmt = select(DealerModel).where(
            DealerModel.id == dealer.id,
            DealerModel.tenant_id == dealer.tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            from prosell.domain.exceptions.dealer_exceptions import DealerNotFoundError

            raise DealerNotFoundError(dealer_id=dealer.id)

        # Update fields
        model.name = dealer.name
        model.slug = dealer.slug
        model.location_address = dealer.location_address
        model.location_city = dealer.location_city
        model.location_state = dealer.location_state
        model.location_zip = dealer.location_zip
        model.location_lat = dealer.location_lat
        model.location_lng = dealer.location_lng
        model.timezone = dealer.timezone
        model.settings = dealer.settings
        model.updated_at = dealer.updated_at

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, dealer_id: UUID, tenant_id: UUID) -> None:
        """Delete a dealer by ID."""
        stmt = select(DealerModel).where(
            DealerModel.id == dealer_id,
            DealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            from prosell.domain.exceptions.dealer_exceptions import DealerNotFoundError

            raise DealerNotFoundError(dealer_id=dealer_id)

        await self.session.delete(model)

    async def list_by_tenant(self, tenant_id: UUID) -> list[Dealer]:
        """List all dealers for a tenant."""
        stmt = select(DealerModel).where(
            DealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    def _to_entity(self, model: DealerModel) -> Dealer:
        """Convert ORM model to domain entity."""
        return Dealer(
            id=model.id,
            tenant_id=model.tenant_id,
            name=model.name,
            slug=model.slug,
            location_address=model.location_address,
            location_city=model.location_city,
            location_state=model.location_state,
            location_zip=model.location_zip,
            location_lat=model.location_lat,
            location_lng=model.location_lng,
            timezone=model.timezone,
            settings=model.settings,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, dealer: Dealer) -> DealerModel:
        """Convert domain entity to ORM model."""
        return DealerModel(
            id=dealer.id,
            tenant_id=dealer.tenant_id,
            name=dealer.name,
            slug=dealer.slug,
            location_address=dealer.location_address,
            location_city=dealer.location_city,
            location_state=dealer.location_state,
            location_zip=dealer.location_zip,
            location_lat=dealer.location_lat,
            location_lng=dealer.location_lng,
            timezone=dealer.timezone,
            settings=dealer.settings,
            created_at=dealer.created_at,
            updated_at=dealer.updated_at,
        )
