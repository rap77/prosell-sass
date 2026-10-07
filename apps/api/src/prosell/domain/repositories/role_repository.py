"""Role repository interface (Port in Clean Architecture)."""

from typing import Protocol
from uuid import UUID

from prosell.domain.entities.role import Role, RoleType


class AbstractRoleRepository(Protocol):
    """
    Role repository interface.

    This is a Port in Clean Architecture terminology.
    The Infrastructure layer will implement this (Adapter).
    """

    async def create(self, role: Role) -> Role:
        """
        Create a new role.

        Args:
            role: Role entity to create

        Returns:
            Created role with generated ID
        """
        ...

    async def update(self, role: Role) -> Role:
        """
        Full replace of a role's mutable fields — name, description,
        grants, scope (bloque 3, item 3.2's PATCH slice).

        Args:
            role: Role entity with its id set and the desired end state

        Returns:
            Updated role
        """
        ...

    async def delete(self, role_id: UUID) -> None:
        """
        Delete a role (bloque 3, item 3.2's DELETE slice). Idempotent —
        deleting a missing role is a no-op, not an error.

        Args:
            role_id: Role UUID
        """
        ...

    async def get_by_id(self, role_id: UUID) -> Role | None:
        """
        Get role by ID.

        Args:
            role_id: Role UUID

        Returns:
            Role entity or None if not found
        """
        ...

    async def get_by_type(self, role_type: RoleType) -> Role | None:
        """
        Get role by type.

        Args:
            role_type: Role type enum

        Returns:
            Role entity or None if not found
        """
        ...

    async def list_all(self) -> list[Role]:
        """
        List all roles.

        Returns:
            List of role entities
        """
        ...

    async def assign_role_to_user(
        self,
        user_id: UUID,
        role_id: UUID,
    ) -> None:
        """
        Assign a role to a user.

        Args:
            user_id: User UUID
            role_id: Role UUID
        """
        ...

    async def remove_role_from_user(
        self,
        user_id: UUID,
        role_id: UUID,
    ) -> None:
        """
        Remove a role from a user.

        Args:
            user_id: User UUID
            role_id: Role UUID
        """
        ...

    async def get_user_roles(self, user_id: UUID) -> list[Role]:
        """
        Get all roles for a user.

        Args:
            user_id: User UUID

        Returns:
            List of role entities
        """
        ...

    async def get_by_id_with_grants(self, role_id: UUID) -> Role | None:
        """
        Get a role by ID, with `grants`/`scope` populated — for the
        admin profiles UI (bloque 3), which needs to show/edit the
        current matrix, not just the role's name/metadata.

        Args:
            role_id: Role UUID

        Returns:
            Role entity (grants/scope populated) or None if not found
        """
        ...

    async def list_with_grants(self, tenant_id: UUID | None) -> list[Role]:
        """
        List roles with `grants`/`scope` populated, for the admin
        profiles UI. `tenant_id=None` means no filter (every role,
        every tenant — the AllScope case); otherwise every system role
        plus that tenant's own custom roles.

        Args:
            tenant_id: Tenant to scope custom roles to, or None for no filter

        Returns:
            List of role entities, grants/scope populated
        """
        ...

    async def get_user_roles_with_grants(self, user_id: UUID) -> list[Role]:
        """
        Get all roles for a user, with the new permission engine's
        `grants`/`scope` populated from `role_grants`/`role_scope`/
        `role_organization_access` (diagnostic doc §6) — unlike
        `get_user_roles()`, which always maps them as empty/None.

        A separate method rather than changing `get_user_roles()` itself:
        that method is already used by `require_permission()` and other
        existing call sites that have no need for the extra joins: this
        one exists for `require_zone_action()` and nothing else so far.

        Args:
            user_id: User UUID

        Returns:
            List of role entities, grants/scope populated
        """
        ...
