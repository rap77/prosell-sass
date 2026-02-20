"""SQLAlchemy implementation of Role repository."""

from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.infrastructure.models.role_model import RoleModel, UserRoleModel


class SqlAlchemyRoleRepository(AbstractRoleRepository):
    """SQLAlchemy implementation of RoleRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, role: Role) -> Role:
        """Create a new role."""
        model = RoleModel(
            id=role.id,
            role_type=role.role_type.value,
            name=role.name,
            description=role.description,
            is_system_role=role.is_system_role,
            tenant_id=role.tenant_id,
            created_at=role.created_at,
            updated_at=role.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, role_id: UUID) -> Role | None:
        """Get role by ID."""
        stmt = select(RoleModel).where(RoleModel.id == role_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_type(self, role_type: RoleType) -> Role | None:
        """Get role by type."""
        stmt = select(RoleModel).where(RoleModel.role_type == role_type.value)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_all(self) -> list[Role]:
        """List all roles."""
        stmt = select(RoleModel)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]

    async def assign_role_to_user(
        self,
        user_id: UUID,
        role_id: UUID,
    ) -> None:
        """Assign a role to a user."""
        # Check if assignment already exists
        stmt = select(UserRoleModel).where(
            UserRoleModel.user_id == user_id,
            UserRoleModel.role_id == role_id,
        )
        result = await self.session.execute(stmt)
        existing = result.scalar_one_or_none()

        if not existing:
            user_role = UserRoleModel(
                id=uuid4(),
                user_id=user_id,
                role_id=role_id,
            )
            self.session.add(user_role)
            await self.session.flush()

    async def remove_role_from_user(
        self,
        user_id: UUID,
        role_id: UUID,
    ) -> None:
        """Remove a role from a user."""
        stmt = select(UserRoleModel).where(
            UserRoleModel.user_id == user_id,
            UserRoleModel.role_id == role_id,
        )
        result = await self.session.execute(stmt)
        user_role = result.scalar_one_or_none()

        if user_role:
            await self.session.delete(user_role)
            await self.session.flush()

    async def get_user_roles(self, user_id: UUID) -> list[Role]:
        """Get all roles for a user."""
        stmt = (
            select(RoleModel)
            .join(UserRoleModel, UserRoleModel.role_id == RoleModel.id)
            .where(UserRoleModel.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]

    def _to_entity(self, model: RoleModel) -> Role:
        """
        Convert ORM model to domain entity using Pydantic model_validate.

        This leverages Pydantic's from_attributes=True for automatic conversion.
        """
        return Role.model_validate(model, from_attributes=True)
