"""SQLAlchemy implementation of UserBranch repository."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.user_branch import UserBranch
from prosell.domain.repositories.user_branch_repository import AbstractUserBranchRepository
from prosell.infrastructure.models.user_branch_model import UserBranchModel


class SqlAlchemyUserBranchRepository(AbstractUserBranchRepository):
    """SQLAlchemy implementation of UserBranchRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def assign(
        self,
        user_id: UUID,
        branch_id: UUID,
        tenant_id: UUID,
        assigned_by: UUID | None = None,
    ) -> UserBranch:
        """Create a new user-branch assignment."""
        model = UserBranchModel(
            user_id=user_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            assigned_by=assigned_by,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def remove(
        self,
        user_id: UUID,
        branch_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Remove a user-branch assignment."""
        stmt = select(UserBranchModel).where(
            UserBranchModel.user_id == user_id,
            UserBranchModel.branch_id == branch_id,
            UserBranchModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        await self.session.delete(model)
        await self.session.flush()
        return True

    async def get_user_branch_ids(
        self,
        user_id: UUID,
        tenant_id: UUID,
    ) -> list[UUID]:
        """Get all branch IDs for a user."""
        stmt = select(UserBranchModel.branch_id).where(
            UserBranchModel.user_id == user_id,
            UserBranchModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_branch_users(
        self,
        branch_id: UUID,
        tenant_id: UUID,
    ) -> list[UUID]:
        """Get all user IDs for a branch (reverse lookup)."""
        stmt = select(UserBranchModel.user_id).where(
            UserBranchModel.branch_id == branch_id,
            UserBranchModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def exists(
        self,
        user_id: UUID,
        branch_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Check if assignment exists."""
        stmt = select(func.count(UserBranchModel.id)).where(
            UserBranchModel.user_id == user_id,
            UserBranchModel.branch_id == branch_id,
            UserBranchModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0  # type: ignore[assignment]
        return count > 0

    async def get_assignment(
        self,
        user_id: UUID,
        branch_id: UUID,
        tenant_id: UUID,
    ) -> UserBranch | None:
        """Get specific assignment record."""
        stmt = select(UserBranchModel).where(
            UserBranchModel.user_id == user_id,
            UserBranchModel.branch_id == branch_id,
            UserBranchModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    def _to_entity(self, model: UserBranchModel) -> UserBranch:
        """Convert ORM model to domain entity."""
        return UserBranch.model_validate(model, from_attributes=True)
