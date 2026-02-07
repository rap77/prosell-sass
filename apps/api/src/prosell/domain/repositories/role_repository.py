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
