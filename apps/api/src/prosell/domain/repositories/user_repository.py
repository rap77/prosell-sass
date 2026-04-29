"""User repository interface (Port in Clean Architecture)."""

from typing import Protocol
from uuid import UUID

from prosell.domain.entities.user import User


class AbstractUserRepository(Protocol):
    """
    User repository interface.

    This is a Port in Clean Architecture terminology.
    The Infrastructure layer will implement this (Adapter).
    """

    async def create(self, user: User) -> User:
        """
        Create a new user.

        Args:
            user: User entity to create

        Returns:
            Created user with generated ID
        """
        ...

    async def get_by_id(self, user_id: UUID) -> User | None:
        """
        Get user by ID.

        Args:
            user_id: User UUID

        Returns:
            User entity or None if not found
        """
        ...

    async def get_by_email(self, email: str) -> User | None:
        """
        Get user by email.

        Args:
            email: User email address

        Returns:
            User entity or None if not found
        """
        ...

    async def update(self, user: User) -> User:
        """
        Update user.

        Args:
            user: User entity with updated fields

        Returns:
            Updated user entity
        """
        ...

    async def delete(self, user_id: UUID) -> None:
        """
        Delete user (soft delete recommended).

        Args:
            user_id: User UUID to delete
        """
        ...

    async def list_with_pagination(
        self,
        limit: int = 100,
        offset: int = 0,
        tenant_id: UUID | None = None,
    ) -> list[User]:
        """
        List users with pagination.

        Args:
            limit: Maximum number of users to return
            offset: Number of users to skip
            tenant_id: Optional tenant ID for multi-tenant filtering

        Returns:
            List of user entities
        """
        ...

    async def get_user_roles(self, user_id: UUID) -> list[str]:
        """
        Get list of role names for a user.

        Args:
            user_id: User UUID

        Returns:
            List of role type strings
        """
        ...

    async def email_exists(self, email: str) -> bool:
        """
        Check if email already exists.

        Args:
            email: Email to check

        Returns:
            True if email exists, False otherwise
        """
        ...

    async def get_by_verification_token(self, token: str) -> User | None:
        """
        Get user by email verification token.

        Args:
            token: Verification token

        Returns:
            User entity or None if not found
        """
        ...

    async def get_by_password_reset_token(self, token: str) -> User | None:
        """
        Get user by password reset token.

        Args:
            token: Password reset token

        Returns:
            User entity or None if not found
        """
        ...

    async def get_by_oauth(
        self,
        provider: str,
        provider_user_id: str,
    ) -> User | None:
        """
        Get user by OAuth provider and provider user ID.

        Args:
            provider: OAuth provider name (e.g., "google", "facebook")
            provider_user_id: User ID from the OAuth provider

        Returns:
            User entity or None if not found
        """
        ...

    async def create_verification_token(
        self,
        user_id: UUID,
        token: str,
        token_type: str,
        expires_in_minutes: int = 60,
    ) -> None:
        """
        Create a verification or reset token for a user.

        Args:
            user_id: User UUID
            token: Token string
            token_type: Type of token ('email_verification', 'password_reset')
            expires_in_minutes: Token expiration time in minutes

        Returns:
            None
        """
        ...

    async def consume_token(self, token: str) -> bool:
        """
        Mark a token as used (consume it).

        Args:
            token: Token string to mark as used

        Returns:
            True if token was found and marked as used, False otherwise
        """
        ...

    async def get_users_by_tenant_and_role(
        self,
        tenant_id: UUID,
        role: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[User]:
        """
        Get users by tenant ID and role.

        Args:
            tenant_id: Tenant/organization ID
            role: Role name (e.g., 'vendedor')
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of user entities
        """
        ...

    async def count_users_by_tenant_and_role(
        self,
        tenant_id: UUID,
        role: str,
    ) -> int:
        """
        Count users by tenant ID and role.

        Args:
            tenant_id: Tenant/organization ID
            role: Role name (e.g., 'vendedor')

        Returns:
            Number of users
        """
        ...
