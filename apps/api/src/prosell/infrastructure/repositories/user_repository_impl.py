"""SQLAlchemy implementation of User repository."""

import json
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.user import User, UserStatus
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.infrastructure.models.user_model import UserModel


class SqlAlchemyUserRepository(AbstractUserRepository):
    """SQLAlchemy implementation of UserRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, user: User) -> User:
        """Create a new user."""
        model = UserModel(
            id=user.id,
            email=user.email,
            password_hash=user.password_hash,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            status=user.status.value,
            email_verified=user.email_verified,
            email_verified_at=user.email_verified_at,
            is_2fa_enabled=user.is_2fa_enabled,
            totp_secret=user.totp_secret,
            backup_codes=json.dumps(user.backup_codes) if user.backup_codes else None,
            last_login_at=user.last_login_at,
            last_login_ip=user.last_login_ip,
            failed_login_attempts=user.failed_login_attempts,
            locked_until=user.locked_until,
            tenant_id=user.tenant_id,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, user_id: UUID) -> User | None:
        """Get user by ID."""
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_email(self, email: str) -> User | None:
        """Get user by email."""
        stmt = select(UserModel).where(UserModel.email == email)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update(self, user: User) -> User:
        """Update user."""
        stmt = select(UserModel).where(UserModel.id == user.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"User not found: {user.id}")

        # Update fields
        model.email = user.email
        model.password_hash = user.password_hash
        model.full_name = user.full_name
        model.avatar_url = user.avatar_url
        model.status = user.status.value
        model.email_verified = user.email_verified
        model.email_verified_at = user.email_verified_at
        model.is_2fa_enabled = user.is_2fa_enabled
        model.totp_secret = user.totp_secret
        model.backup_codes = json.dumps(user.backup_codes) if user.backup_codes else None
        model.last_login_at = user.last_login_at
        model.last_login_ip = user.last_login_ip
        model.failed_login_attempts = user.failed_login_attempts
        model.locked_until = user.locked_until
        model.tenant_id = user.tenant_id
        model.updated_at = datetime.now(UTC)

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, user_id: UUID) -> None:
        """Delete user (soft delete)."""
        # Soft delete by setting status to suspended
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.status = UserStatus.SUSPENDED.value
            model.updated_at = datetime.now(UTC)
            await self.session.flush()

    async def list_with_pagination(
        self,
        limit: int = 100,
        offset: int = 0,
        tenant_id: UUID | None = None,
    ) -> list[User]:
        """List users with pagination."""
        stmt = select(UserModel)

        if tenant_id is not None:
            stmt = stmt.where(UserModel.tenant_id == tenant_id)

        stmt = stmt.limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]

    async def get_user_roles(self, user_id: UUID) -> list[str]:
        """Get list of role names for a user."""
        from prosell.infrastructure.models.role_model import RoleModel, UserRoleModel

        stmt = (
            select(RoleModel.role_type)
            .join(UserRoleModel, UserRoleModel.role_id == RoleModel.id)
            .where(UserRoleModel.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def email_exists(self, email: str) -> bool:
        """Check if email already exists."""
        stmt = select(func.count(UserModel.id)).where(UserModel.email == email)
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0
        return count > 0

    async def get_by_verification_token(self, token: str) -> User | None:
        """Get user by email verification token."""
        from datetime import datetime

        from prosell.infrastructure.models.user_token_model import UserTokenModel

        stmt = select(UserTokenModel).where(
            UserTokenModel.token == token,
            UserTokenModel.token_type == "email_verification",
            UserTokenModel.used_at.is_(None),
            UserTokenModel.expires_at > datetime.now(UTC),
        )
        result = await self.session.execute(stmt)
        token_model = result.scalar_one_or_none()

        if not token_model:
            return None

        # Get user by ID
        return await self.get_by_id(token_model.user_id)

    async def get_by_password_reset_token(self, token: str) -> User | None:
        """Get user by password reset token."""
        from datetime import datetime

        from prosell.infrastructure.models.user_token_model import UserTokenModel

        stmt = select(UserTokenModel).where(
            UserTokenModel.token == token,
            UserTokenModel.token_type == "password_reset",
            UserTokenModel.used_at.is_(None),
            UserTokenModel.expires_at > datetime.now(UTC),
        )
        result = await self.session.execute(stmt)
        token_model = result.scalar_one_or_none()

        if not token_model:
            return None

        # Get user by ID
        return await self.get_by_id(token_model.user_id)

    async def get_by_oauth(
        self,
        provider: str,
        provider_user_id: str,
    ) -> User | None:
        """Get user by OAuth provider and provider user ID."""
        from prosell.infrastructure.models.oauth_account_model import OAuthAccountModel

        stmt = select(OAuthAccountModel).where(
            OAuthAccountModel.provider == provider,
            OAuthAccountModel.provider_user_id == provider_user_id,
        )
        result = await self.session.execute(stmt)
        oauth_model = result.scalar_one_or_none()

        if not oauth_model:
            return None

        # Get user by ID
        return await self.get_by_id(oauth_model.user_id)

    async def create_verification_token(
        self,
        user_id: UUID,
        token: str,
        token_type: str,
        expires_in_minutes: int = 60,
    ) -> None:
        """Create a verification or reset token for a user."""
        from datetime import datetime, timedelta

        from prosell.infrastructure.models.user_token_model import UserTokenModel

        expires_at = datetime.now(UTC) + timedelta(minutes=expires_in_minutes)

        token_model = UserTokenModel(
            user_id=user_id,
            token=token,
            token_type=token_type,
            expires_at=expires_at,
        )
        self.session.add(token_model)
        await self.session.flush()

    async def consume_token(self, token: str) -> bool:
        """Mark a token as used (consume it)."""
        from datetime import datetime

        from prosell.infrastructure.models.user_token_model import UserTokenModel

        stmt = select(UserTokenModel).where(UserTokenModel.token == token)
        result = await self.session.execute(stmt)
        token_model = result.scalar_one_or_none()

        if not token_model:
            return False

        # Mark as used
        token_model.used_at = datetime.now(UTC)
        await self.session.flush()
        return True

    async def get_users_by_tenant_and_role(
        self,
        tenant_id: UUID,
        role: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[User]:
        """
        Get users by tenant ID and role.

        Joins with user_roles and roles tables to filter by role.
        """
        from prosell.infrastructure.models.role_model import RoleModel, UserRoleModel

        stmt = (
            select(UserModel)
            .join(UserRoleModel, UserRoleModel.user_id == UserModel.id)
            .join(RoleModel, RoleModel.id == UserRoleModel.role_id)
            .where(
                UserModel.tenant_id == tenant_id,
                RoleModel.role_type == role,
            )
        )

        stmt = stmt.limit(limit).offset(skip)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]

    async def count_users_by_tenant_and_role(
        self,
        tenant_id: UUID,
        role: str,
    ) -> int:
        """
        Count users by tenant ID and role.

        Returns the total count (before pagination).
        """
        from prosell.infrastructure.models.role_model import RoleModel, UserRoleModel

        stmt = (
            select(func.count(UserModel.id))
            .join(UserRoleModel, UserRoleModel.user_id == UserModel.id)
            .join(RoleModel, RoleModel.id == UserRoleModel.role_id)
            .where(
                UserModel.tenant_id == tenant_id,
                RoleModel.role_type == role,
            )
        )

        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0
        return count

    def _to_entity(self, model: UserModel) -> User:
        """
        Convert ORM model to domain entity.

        NOTE: We manually construct the User instead of using model_validate
        with from_attributes=True because the latter would trigger lazy-loaded
        relationships (roles, sessions) which cause MissingGreenlet errors in
        async SQLAlchemy.
        """
        return User(
            id=model.id,
            email=model.email,
            password_hash=model.password_hash,
            full_name=model.full_name,
            avatar_url=model.avatar_url,
            status=UserStatus(model.status),  # Convert str to enum
            email_verified=model.email_verified,
            email_verified_at=model.email_verified_at,
            is_2fa_enabled=model.is_2fa_enabled,
            totp_secret=model.totp_secret,
            backup_codes=(
                json.loads(model.backup_codes) if model.backup_codes else None
            ),  # Parse JSON
            last_login_at=model.last_login_at,
            last_login_ip=model.last_login_ip,
            failed_login_attempts=model.failed_login_attempts,
            locked_until=model.locked_until,
            tenant_id=model.tenant_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
            roles=None,  # Don't trigger lazy load
        )
