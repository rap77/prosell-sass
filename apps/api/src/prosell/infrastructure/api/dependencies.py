"""Dependency injection container for FastAPI."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from functools import lru_cache
from typing import TYPE_CHECKING, Annotated

if TYPE_CHECKING:
    from prosell.application.use_cases.auth.enable_2fa import Disable2FAUseCase, Enable2FAUseCase
    from prosell.application.use_cases.auth.login_user import LoginUserUseCase
    from prosell.application.use_cases.auth.oauth_login import OAuthLoginUseCase
    from prosell.application.use_cases.auth.refresh_token import (
        RefreshTokenUseCase as AuthRefreshTokenUseCase,
    )
    from prosell.application.use_cases.auth.register_user import RegisterUserUseCase
    from prosell.application.use_cases.auth.verify_2fa import Verify2FAUseCase
    from prosell.application.use_cases.facebook.authorize_account import (
        AuthorizeFacebookAccountUseCase,
    )
    from prosell.application.use_cases.facebook.disconnect_account import (
        DisconnectFacebookAccountUseCase,
        FetchPagesUseCase,
        ListAccountsUseCase,
        SetDefaultPageUseCase,
    )
    from prosell.application.use_cases.facebook.oauth_callback import OAuthCallbackUseCase
    from prosell.application.use_cases.facebook.refresh_token import RefreshTokenUseCase
    from prosell.infrastructure.repositories.facebook_account_repository_impl import (
        SqlAlchemyFacebookAccountRepository,
    )
    from prosell.infrastructure.repositories.facebook_page_repository_impl import (
        SqlAlchemyFacebookPageRepository,
    )

# NOTE: from __future__ import annotations makes all annotations lazy strings,
# which means FastAPI's Depends() resolution still works since it uses
# get_type_hints() which resolves string annotations at runtime using the
# module's global namespace. The domain interface types are imported at module
# level to ensure they are available for resolution.

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.ports.email_service import AbstractEmailService
from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.core.config import get_oauth_settings, get_settings, settings
from prosell.domain.entities.role import ROLE_PERMISSIONS, Permission, RoleType
from prosell.domain.entities.user import User
from prosell.domain.ports import (
    IEncryptionService,
    IJWTService,
    IOAuthService,
    IPasswordService,
    ITokenHasher,
    ITOTPService,
)
from prosell.domain.ports.i_facebook_marketplace_service import (
    IFacebookMarketplaceOAuthService,
)
from prosell.domain.repositories.facebook_account_repository import IFacebookAccountRepository
from prosell.domain.repositories.facebook_page_repository import IFacebookPageRepository
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.oauth_repository_impl import SqlAlchemyOAuthRepository
from prosell.infrastructure.repositories.role_repository_impl import SqlAlchemyRoleRepository
from prosell.infrastructure.repositories.session_repository_impl import SqlAlchemySessionRepository
from prosell.infrastructure.repositories.user_repository_impl import SqlAlchemyUserRepository
from prosell.infrastructure.security.token_hasher import TokenHasher
from prosell.infrastructure.services.email_service import (
    MockEmailService,
    SendGridEmailService,
)
from prosell.infrastructure.services.oauth_service_impl import OAuthServiceImpl
from prosell.infrastructure.services.password_service import PasswordService
from prosell.infrastructure.services.redis_service import RedisService
from prosell.infrastructure.services.totp_service import TOTPService

# =============================================================================
# REPOSITORY FACTORIES
# =============================================================================


async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyUserRepository:
    """Get user repository instance."""
    return SqlAlchemyUserRepository(session)


async def get_role_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyRoleRepository:
    """Get role repository instance."""
    return SqlAlchemyRoleRepository(session)


async def get_session_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemySessionRepository:
    """Get session repository instance."""
    return SqlAlchemySessionRepository(session)


async def get_oauth_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyOAuthRepository:
    """Get OAuth repository instance."""
    return SqlAlchemyOAuthRepository(session)


# =============================================================================
# SERVICE FACTORIES (SINGLETONS)
# =============================================================================


def get_jwt_service() -> IJWTService:
    """Get JWT service instance (singleton)."""
    from prosell.infrastructure.services.jwt_service import JWTService

    return JWTService()


def get_password_service() -> IPasswordService:
    """Get password service instance (singleton)."""

    return PasswordService()


def get_totp_service() -> ITOTPService:
    """Get TOTP service instance (singleton)."""

    return TOTPService()


def get_email_service() -> AbstractEmailService:
    """Get email service instance (singleton)."""
    if settings.use_mock_email:
        return MockEmailService()
    return SendGridEmailService()


def get_token_hasher() -> ITokenHasher:
    """Get token hasher service instance (singleton)."""
    return TokenHasher()


@lru_cache
def get_oauth_service() -> IOAuthService:
    """Get OAuth service instance (singleton via lru_cache)."""
    oauth_settings = get_oauth_settings()
    return OAuthServiceImpl(settings=oauth_settings)


# =============================================================================
# AUTH DEPENDENCIES
# =============================================================================


async def get_current_auth_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(HTTPBearer())],
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
    user_repository: Annotated[SqlAlchemyUserRepository, Depends(get_user_repository)],
) -> User:
    """
    Get authenticated user from JWT token with full entity.

    This dependency:
    1. Verifies JWT and extracts user_id from token
    2. Fetches full User entity from database
    3. Returns User with tenant_id for multi-tenant operations

    Use this in protected endpoints that need tenant_id.

    Returns:
        User entity with id, tenant_id, and roles

    Raises:
        HTTPException: If token invalid or user not found
    """
    from uuid import UUID

    from fastapi import HTTPException, status

    # Verify token type
    payload = jwt_service.verify_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    # Get user from database
    user_id = UUID(payload["sub"])
    user = await user_repository.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def require_permission(permission: Permission) -> Callable[..., Awaitable[User]]:
    """
    Dependency factory for permission-based authorization.

    Usage in FastAPI routes:
        current_user: User = Depends(require_permission(Permission.ORG_CREATE))

    Args:
        permission: Required permission for the endpoint

    Returns:
        Dependency function that FastAPI can call
    """

    async def _check(
        current_user: Annotated[User, Depends(get_current_auth_user)],
        role_repository: Annotated[SqlAlchemyRoleRepository, Depends(get_role_repository)],
    ) -> User:
        """Check if user has required permission."""
        from fastapi import HTTPException, status

        # Fetch user roles with permissions
        user_roles = await role_repository.get_user_roles(current_user.id)

        # Check if any role has the required permission
        has_permission = any(
            permission in ROLE_PERMISSIONS.get(role.role_type, set()) for role in user_roles
        )

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission.value}' required",
            )

        return current_user

    return _check


def require_role(role_type: RoleType) -> Callable[..., Awaitable[User]]:
    """
    Dependency factory for role-based authorization.

    Usage in FastAPI routes:
        current_user: User = Depends(require_role(RoleType.SUPER_ADMIN))

    Args:
        role_type: Required role for the endpoint

    Returns:
        Dependency function that FastAPI can call
    """

    async def _check(
        current_user: Annotated[User, Depends(get_current_auth_user)],
        role_repository: Annotated[SqlAlchemyRoleRepository, Depends(get_role_repository)],
    ) -> User:
        """Check if user has required role."""
        from fastapi import HTTPException, status

        # Fetch user roles
        user_roles = await role_repository.get_user_roles(current_user.id)

        # Check if user has the required role
        has_role = any(role.role_type == role_type for role in user_roles)

        if not has_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role_type.value}' required",
            )

        return current_user

    return _check


# =============================================================================
# USE CASE FACTORIES
# =============================================================================


async def get_register_user_use_case(
    user_repository: Annotated[SqlAlchemyUserRepository, Depends(get_user_repository)],
    password_service: Annotated[IPasswordService, Depends(get_password_service)],
    email_service: Annotated[AbstractEmailService, Depends(get_email_service)],
) -> RegisterUserUseCase:
    """Get RegisterUser use case instance."""
    from prosell.application.use_cases.auth.register_user import RegisterUserUseCase

    return RegisterUserUseCase(user_repository, password_service, email_service)


async def get_login_user_use_case(
    user_repository: Annotated[SqlAlchemyUserRepository, Depends(get_user_repository)],
    password_service: Annotated[IPasswordService, Depends(get_password_service)],
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
) -> LoginUserUseCase:
    """Get LoginUser use case instance."""
    from prosell.application.use_cases.auth.login_user import LoginUserUseCase

    return LoginUserUseCase(user_repository, password_service, jwt_service)


async def get_refresh_token_use_case(
    user_repository: Annotated[SqlAlchemyUserRepository, Depends(get_user_repository)],
    session_repository: Annotated[SqlAlchemySessionRepository, Depends(get_session_repository)],
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
    token_hasher: Annotated[ITokenHasher, Depends(get_token_hasher)],
) -> AuthRefreshTokenUseCase:
    """Get RefreshToken use case instance."""
    from prosell.application.use_cases.auth.refresh_token import RefreshTokenUseCase

    return RefreshTokenUseCase(user_repository, session_repository, jwt_service, token_hasher)


async def get_oauth_login_use_case(
    user_repository: Annotated[SqlAlchemyUserRepository, Depends(get_user_repository)],
    oauth_repository: Annotated[SqlAlchemyOAuthRepository, Depends(get_oauth_repository)],
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
) -> OAuthLoginUseCase:
    """Get OAuthLogin use case instance."""
    from prosell.application.use_cases.auth.oauth_login import OAuthLoginUseCase

    return OAuthLoginUseCase(user_repository, oauth_repository, jwt_service)


async def get_enable_2fa_use_case(
    user_repository: Annotated[SqlAlchemyUserRepository, Depends(get_user_repository)],
    totp_service: Annotated[ITOTPService, Depends(get_totp_service)],
    email_service: Annotated[AbstractEmailService, Depends(get_email_service)],
) -> Enable2FAUseCase:
    """Get Enable2FA use case instance."""
    from prosell.application.use_cases.auth.enable_2fa import Enable2FAUseCase

    return Enable2FAUseCase(user_repository, totp_service, email_service)


async def get_disable_2fa_use_case(
    user_repository: Annotated[SqlAlchemyUserRepository, Depends(get_user_repository)],
    totp_service: Annotated[ITOTPService, Depends(get_totp_service)],
) -> Disable2FAUseCase:
    """Get Disable2FA use case instance."""
    from prosell.application.use_cases.auth.enable_2fa import Disable2FAUseCase

    return Disable2FAUseCase(user_repository, totp_service)


async def get_verify_2fa_use_case(
    user_repository: Annotated[SqlAlchemyUserRepository, Depends(get_user_repository)],
    session_repository: Annotated[SqlAlchemySessionRepository, Depends(get_session_repository)],
    totp_service: Annotated[ITOTPService, Depends(get_totp_service)],
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
    token_hasher: Annotated[ITokenHasher, Depends(get_token_hasher)],
) -> Verify2FAUseCase:
    """Get Verify2FA use case instance."""
    from prosell.application.use_cases.auth.verify_2fa import Verify2FAUseCase

    return Verify2FAUseCase(
        user_repository,
        session_repository,
        totp_service,
        jwt_service,
        token_hasher,
    )


@lru_cache
def get_spaces_service() -> IDOSpacesService:
    """Get DO Spaces service instance (singleton via lru_cache)."""
    from prosell.infrastructure.services.do_spaces_service import DOSpacesService

    return DOSpacesService()


# =============================================================================
# FACEBOOK MARKETPLACE DEPENDENCIES
# =============================================================================


async def get_facebook_account_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyFacebookAccountRepository:
    """Get Facebook Account repository instance."""
    from prosell.infrastructure.repositories.facebook_account_repository_impl import (
        SqlAlchemyFacebookAccountRepository,
    )

    return SqlAlchemyFacebookAccountRepository(session)


async def get_facebook_page_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyFacebookPageRepository:
    """Get Facebook Page repository instance."""
    from prosell.infrastructure.repositories.facebook_page_repository_impl import (
        SqlAlchemyFacebookPageRepository,
    )

    return SqlAlchemyFacebookPageRepository(session)


def get_facebook_encryption_service() -> IEncryptionService:
    """Get token encryption service instance (singleton)."""
    import hashlib

    from prosell.infrastructure.services.token_encryption_service import (
        TokenEncryptionService,
    )

    settings = get_settings()
    # Derive 32-byte key from config string using SHA256
    key_bytes = hashlib.sha256(settings.facebook_encryption_key.encode()).digest()

    return TokenEncryptionService(key_bytes)


def get_facebook_oauth_service() -> IFacebookMarketplaceOAuthService:
    """Get Facebook OAuth service instance (singleton)."""
    from prosell.infrastructure.services.facebook_marketplace_oauth_service import (
        FacebookMarketplaceOAuthServiceImpl,
    )

    return FacebookMarketplaceOAuthServiceImpl()


def get_redis_service() -> RedisService:
    """Get Redis service instance."""
    from prosell.infrastructure.services.redis_service import RedisService

    return RedisService()


async def get_facebook_authorize_use_case(
    oauth_service: Annotated[IFacebookMarketplaceOAuthService, Depends(get_facebook_oauth_service)],
    redis_service: Annotated[RedisService, Depends(get_redis_service)],
) -> AuthorizeFacebookAccountUseCase:
    """Get AuthorizeFacebookAccount use case instance."""
    from prosell.application.use_cases.facebook.authorize_account import (
        AuthorizeFacebookAccountUseCase,
    )

    return AuthorizeFacebookAccountUseCase(
        oauth_service,
        redis_service,
    )


async def get_facebook_callback_use_case(
    oauth_service: Annotated[IFacebookMarketplaceOAuthService, Depends(get_facebook_oauth_service)],
    facebook_account_repository: Annotated[
        IFacebookAccountRepository, Depends(get_facebook_account_repository)
    ],
    facebook_page_repository: Annotated[
        IFacebookPageRepository, Depends(get_facebook_page_repository)
    ],
    encryption_service: Annotated[IEncryptionService, Depends(get_facebook_encryption_service)],
    redis_service: Annotated[RedisService, Depends(get_redis_service)],
) -> OAuthCallbackUseCase:
    """Get OAuthCallback use case instance."""
    from prosell.application.use_cases.facebook.oauth_callback import OAuthCallbackUseCase

    return OAuthCallbackUseCase(
        oauth_service,
        facebook_account_repository,
        facebook_page_repository,
        encryption_service,
        redis_service,
    )


async def get_facebook_disconnect_use_case(
    facebook_account_repository: Annotated[
        IFacebookAccountRepository, Depends(get_facebook_account_repository)
    ],
    facebook_page_repository: Annotated[
        IFacebookPageRepository, Depends(get_facebook_page_repository)
    ],
) -> DisconnectFacebookAccountUseCase:
    """Get DisconnectFacebookAccount use case instance."""
    from prosell.application.use_cases.facebook.disconnect_account import (
        DisconnectFacebookAccountUseCase,
    )

    return DisconnectFacebookAccountUseCase(
        facebook_account_repository,
        facebook_page_repository,
    )


async def get_facebook_list_accounts_use_case(
    facebook_account_repository: Annotated[
        IFacebookAccountRepository, Depends(get_facebook_account_repository)
    ],
) -> ListAccountsUseCase:
    """Get ListAccounts use case instance."""
    from prosell.application.use_cases.facebook.disconnect_account import (
        ListAccountsUseCase,
    )

    return ListAccountsUseCase(facebook_account_repository)


async def get_facebook_fetch_pages_use_case(
    facebook_page_repository: Annotated[
        IFacebookPageRepository, Depends(get_facebook_page_repository)
    ],
) -> FetchPagesUseCase:
    """Get FetchPages use case instance."""
    from prosell.application.use_cases.facebook.disconnect_account import FetchPagesUseCase

    return FetchPagesUseCase(facebook_page_repository)


async def get_facebook_set_default_use_case(
    facebook_page_repository: Annotated[
        IFacebookPageRepository, Depends(get_facebook_page_repository)
    ],
    facebook_account_repository: Annotated[
        IFacebookAccountRepository, Depends(get_facebook_account_repository)
    ],
) -> SetDefaultPageUseCase:
    """Get SetDefaultPage use case instance."""
    from prosell.application.use_cases.facebook.disconnect_account import (
        SetDefaultPageUseCase,
    )

    return SetDefaultPageUseCase(
        facebook_page_repository,
        facebook_account_repository,
    )


async def get_facebook_refresh_use_case(
    facebook_account_repository: Annotated[
        IFacebookAccountRepository, Depends(get_facebook_account_repository)
    ],
    oauth_service: Annotated[IFacebookMarketplaceOAuthService, Depends(get_facebook_oauth_service)],
    encryption_service: Annotated[IEncryptionService, Depends(get_facebook_encryption_service)],
) -> RefreshTokenUseCase:
    """Get RefreshToken use case instance."""
    from prosell.application.use_cases.facebook.refresh_token import RefreshTokenUseCase

    return RefreshTokenUseCase(
        facebook_account_repository,
        oauth_service,
        encryption_service,
    )
