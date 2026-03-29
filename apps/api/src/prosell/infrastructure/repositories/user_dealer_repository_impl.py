"""SQLAlchemy implementation of UserDealer repository."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.user_dealer import UserDealer
from prosell.domain.repositories.user_dealer_repository import AbstractUserDealerRepository
from prosell.infrastructure.models.user_dealer_model import UserDealerModel


class SqlAlchemyUserDealerRepository(AbstractUserDealerRepository):
    """SQLAlchemy implementation of UserDealerRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def assign(
        self,
        user_id: UUID,
        dealer_id: UUID,
        tenant_id: UUID,
        assigned_by: UUID | None = None,
    ) -> UserDealer:
        """Create a new user-dealer assignment."""
        model = UserDealerModel(
            user_id=user_id,
            dealer_id=dealer_id,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def remove(
        self,
        user_id: UUID,
        dealer_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Remove a user-dealer assignment."""
        stmt = select(UserDealerModel).where(
            UserDealerModel.user_id == user_id,
            UserDealerModel.dealer_id == dealer_id,
            UserDealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        await self.session.delete(model)
        await self.session.flush()
        return True

    async def get_user_dealer_ids(
        self,
        user_id: UUID,
        tenant_id: UUID,
    ) -> list[UUID]:
        """Get all dealer IDs for a user."""
        stmt = select(UserDealerModel.dealer_id).where(
            UserDealerModel.user_id == user_id,
            UserDealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_dealer_users(
        self,
        dealer_id: UUID,
        tenant_id: UUID,
    ) -> list[UUID]:
        """Get all user IDs for a dealer (reverse lookup)."""
        stmt = select(UserDealerModel.user_id).where(
            UserDealerModel.dealer_id == dealer_id,
            UserDealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def exists(
        self,
        user_id: UUID,
        dealer_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Check if assignment exists."""
        stmt = select(func.count(UserDealerModel.id)).where(
            UserDealerModel.user_id == user_id,
            UserDealerModel.dealer_id == dealer_id,
            UserDealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0  # type: ignore[assignment]
        return count > 0

    async def get_assignment(
        self,
        user_id: UUID,
        dealer_id: UUID,
        tenant_id: UUID,
    ) -> UserDealer | None:
        """Get specific assignment record."""
        stmt = select(UserDealerModel).where(
            UserDealerModel.user_id == user_id,
            UserDealerModel.dealer_id == dealer_id,
            UserDealerModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    def _to_entity(self, model: UserDealerModel) -> UserDealer:
        """Convert ORM model to domain entity."""
        return UserDealer.model_validate(model, from_attributes=True)
