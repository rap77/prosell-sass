"""SQLAlchemy implementation of Role repository."""

from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.domain.value_objects.role_grant import RoleGrant
from prosell.infrastructure.models.role_model import (
    RoleGrantModel,
    RoleModel,
    RoleOrganizationAccessModel,
    RoleScopeModel,
    UserRoleModel,
)


def _scope_type_of(scope: OwnScope | AllScope | ExplicitOrgsScope) -> str:
    """Inverse of `_build_scope()` — the domain Scope's row value for
    `role_scope.scope_type`."""
    if isinstance(scope, OwnScope):
        return "own"
    if isinstance(scope, AllScope):
        return "all"
    return "explicit"


class SqlAlchemyRoleRepository(AbstractRoleRepository):
    """SQLAlchemy implementation of RoleRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, role: Role) -> Role:
        """Create a new role, persisting its initial `grants`/`scope`
        atomically with the row — the admin profiles UI (bloque 3, item
        3.2) creates a profile and its starting matrix as one logical
        operation, not two."""
        model = RoleModel(
            id=role.id,
            role_type=role.role_type.value if role.role_type is not None else None,
            name=role.name,
            description=role.description,
            is_system_role=role.is_system_role,
            tenant_id=role.tenant_id,
            created_at=role.created_at,
            updated_at=role.updated_at,
        )
        self.session.add(model)

        for grant in role.grants:
            self.session.add(
                RoleGrantModel(id=uuid4(), role_id=role.id, zone=grant.zone, action=grant.action)
            )

        if role.scope is not None:
            self.session.add(
                RoleScopeModel(id=uuid4(), role_id=role.id, scope_type=_scope_type_of(role.scope))
            )
            if isinstance(role.scope, ExplicitOrgsScope):
                for org_id in role.scope.organization_ids:
                    self.session.add(
                        RoleOrganizationAccessModel(
                            id=uuid4(), role_id=role.id, organization_id=org_id
                        )
                    )

        await self.session.flush()

        created = self._to_entity(model)
        # Avoid touching model.grants/model.scope here — those are lazy
        # relationships and would hit the same MissingGreenlet trap
        # _to_entity_with_grants()'s selectinload() exists to avoid. We
        # already know the values: they're what we just wrote above.
        created.grants = list(role.grants)
        created.scope = role.scope
        return created

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

    async def get_user_roles_with_grants(self, user_id: UUID) -> list[Role]:
        """Get all roles for a user, with `grants`/`scope` populated.

        Eagerly loads the relationships with `selectinload()` — unlike
        `_to_entity()`'s async-unsafe default, loading them here is safe
        because they're fetched up front, not accessed lazily.
        """
        stmt = (
            select(RoleModel)
            .join(UserRoleModel, UserRoleModel.role_id == RoleModel.id)
            .where(UserRoleModel.user_id == user_id)
            .options(
                selectinload(RoleModel.grants),
                selectinload(RoleModel.scope),
                selectinload(RoleModel.organization_access),
            )
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity_with_grants(model) for model in models]

    async def get_by_id_with_grants(self, role_id: UUID) -> Role | None:
        """Same as `get_by_id()`, with `grants`/`scope` populated — for
        the admin profiles UI (bloque 3, item 3.2), which needs to show
        and edit a role's current matrix, not just its name/metadata."""
        stmt = (
            select(RoleModel)
            .where(RoleModel.id == role_id)
            .options(
                selectinload(RoleModel.grants),
                selectinload(RoleModel.scope),
                selectinload(RoleModel.organization_access),
            )
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity_with_grants(model) if model else None

    async def list_with_grants(self, tenant_id: UUID | None) -> list[Role]:
        """List roles with `grants`/`scope` populated, for the admin
        profiles UI. `tenant_id=None` means no filter at all (the
        AllScope case — every role, every tenant); otherwise returns
        every system role (`tenant_id IS NULL`) plus that tenant's own
        custom roles, mirroring the `None if is_org_admin else
        current_user.tenant_id` visibility pattern already used
        elsewhere in the app for data scoping."""
        stmt = select(RoleModel).options(
            selectinload(RoleModel.grants),
            selectinload(RoleModel.scope),
            selectinload(RoleModel.organization_access),
        )
        if tenant_id is not None:
            stmt = stmt.where((RoleModel.tenant_id.is_(None)) | (RoleModel.tenant_id == tenant_id))
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity_with_grants(model) for model in models]

    def _to_entity_with_grants(self, model: RoleModel) -> Role:
        """Same base mapping as `_to_entity()`, plus `grants`/`scope`
        populated from relationships the caller already eager-loaded."""
        role = self._to_entity(model)
        role.grants = [RoleGrant(zone=g.zone, action=g.action) for g in model.grants]
        role.scope = self._build_scope(model)
        return role

    def _build_scope(self, model: RoleModel) -> OwnScope | AllScope | ExplicitOrgsScope | None:
        """Build the domain Scope value object from `RoleScopeModel` +
        (when explicit) `RoleOrganizationAccessModel` rows."""
        if model.scope is None:
            return None
        if model.scope.scope_type == "own":
            return OwnScope()
        if model.scope.scope_type == "all":
            return AllScope()
        return ExplicitOrgsScope(
            organization_ids=frozenset(a.organization_id for a in model.organization_access)
        )

    def _to_entity(self, model: RoleModel) -> Role:
        """
        Convert ORM model to domain entity.

        Built explicitly rather than via `Role.model_validate(model,
        from_attributes=True)`: `RoleModel.grants`/`.scope` are lazy
        SQLAlchemy relationships that share a name with `Role.grants`/
        `.scope` (the new permission engine, §6 of the diagnostic) —
        `from_attributes` would try to access them here and crash with
        MissingGreenlet outside an awaited context, since this method
        isn't async. Loading the real grants/scope from the DB is a
        later workbook item; until then every role maps as empty/None
        here regardless of what rows exist.
        """
        return Role(
            id=model.id,
            role_type=RoleType(model.role_type) if model.role_type else None,
            name=model.name,
            description=model.description,
            is_system_role=model.is_system_role,
            tenant_id=model.tenant_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
