"""Dependency injection container for FastAPI."""

from __future__ import annotations

__all__ = ["get_async_session"]

from collections.abc import Awaitable, Callable
from functools import lru_cache
from typing import TYPE_CHECKING, Annotated

if TYPE_CHECKING:
    from prosell.application.use_cases.auth.change_password import ChangePasswordUseCase
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
    )
    from prosell.application.use_cases.facebook.fetch_pages import FetchPagesUseCase
    from prosell.application.use_cases.facebook.list_accounts import ListAccountsUseCase
    from prosell.application.use_cases.facebook.oauth_callback import OAuthCallbackUseCase
    from prosell.application.use_cases.facebook.refresh_token import RefreshTokenUseCase
    from prosell.application.use_cases.facebook.set_default_page import SetDefaultPageUseCase
    from prosell.application.use_cases.organization.accept_organization_invitation import (
        AcceptOrganizationInvitationUseCase,
    )
    from prosell.application.use_cases.organization.create_dealer_organization import (
        CreateDealerOrganizationUseCase,
    )
    from prosell.application.use_cases.publisher.publish_vehicle import PublishVehicleUseCase
    from prosell.application.use_cases.user_branch.assign_user_branch import (
        AssignUserBranchUseCase,
    )
    from prosell.application.use_cases.user_branch.bulk_assign import BulkAssignUseCase
    from prosell.application.use_cases.user_branch.remove_user_branch import (
        RemoveUserBranchUseCase,
    )
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

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.application.use_cases.auth.issue_user_session import IssueUserSessionUseCase
from prosell.application.use_cases.organization.invite_dealer_owner import (
    InviteDealerOwnerUseCase,
)
from prosell.core.config import get_oauth_settings, get_settings, settings
from prosell.domain.entities.role import ROLE_PERMISSIONS, Permission, RoleType
from prosell.domain.entities.user import User
from prosell.domain.ports import (
    AbstractEmailService,
    IEncryptionService,
    IJWTService,
    IOAuthService,
    IPasswordService,
    IRedisService,
    ITokenHasher,
    ITOTPService,
)
from prosell.domain.ports.i_facebook_marketplace_service import (
    IFacebookMarketplaceOAuthService,
)
from prosell.domain.ports.i_task_dispatcher import ITaskDispatcher
from prosell.domain.repositories import (
    AbstractOAuthRepository,
    AbstractRoleRepository,
    AbstractSessionRepository,
    AbstractUserRepository,
)
from prosell.domain.repositories.branch_repository import AbstractBranchRepository
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.facebook_account_repository import IFacebookAccountRepository
from prosell.domain.repositories.facebook_page_repository import IFacebookPageRepository
from prosell.domain.repositories.organization_invitation_repository import (
    AbstractOrganizationInvitationRepository,
)
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.organization_vertical_repository import (
    AbstractOrganizationVerticalRepository,
)
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.domain.repositories.user_branch_repository import (
    AbstractUserBranchRepository,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.oauth_repository_impl import SqlAlchemyOAuthRepository
from prosell.infrastructure.repositories.organization_invitation_repository_impl import (
    SqlAlchemyOrganizationInvitationRepository,
)
from prosell.infrastructure.repositories.organization_repository_impl import (
    SqlAlchemyOrganizationRepository,
)
from prosell.infrastructure.repositories.organization_vertical_repository_impl import (
    SqlAlchemyOrganizationVerticalRepository,
)
from prosell.infrastructure.repositories.role_repository_impl import SqlAlchemyRoleRepository
from prosell.infrastructure.repositories.session_repository_impl import SqlAlchemySessionRepository
from prosell.infrastructure.repositories.user_repository_impl import SqlAlchemyUserRepository
from prosell.infrastructure.security.token_hasher import TokenHasher
from prosell.infrastructure.services.email import (
    EmailService,
    EmailTemplateRenderer,
    LoggingSender,
    ResendSender,
)
from prosell.infrastructure.services.oauth_service_impl import OAuthServiceImpl
from prosell.infrastructure.services.password_service import PasswordService
from prosell.infrastructure.services.redis_service import RedisService
from prosell.infrastructure.services.totp_service import TOTPService
from prosell.infrastructure.tasks.taskiq_task_dispatcher import TaskiqTaskDispatcher

# =============================================================================
# REPOSITORY FACTORIES
# =============================================================================


async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractUserRepository:
    """Get user repository instance."""
    return SqlAlchemyUserRepository(session)


async def get_role_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractRoleRepository:
    """Get role repository instance."""
    return SqlAlchemyRoleRepository(session)


async def get_session_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractSessionRepository:
    """Get session repository instance."""
    return SqlAlchemySessionRepository(session)


async def get_oauth_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractOAuthRepository:
    """Get OAuth repository instance."""
    return SqlAlchemyOAuthRepository(session)


async def get_organization_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractOrganizationRepository:
    """Get organization repository instance."""
    return SqlAlchemyOrganizationRepository(session)


async def get_organization_vertical_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractOrganizationVerticalRepository:
    """Get organization vertical repository instance."""
    return SqlAlchemyOrganizationVerticalRepository(session)


async def get_organization_invitation_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractOrganizationInvitationRepository:
    """Get organization invitation repository instance."""
    return SqlAlchemyOrganizationInvitationRepository(session)


async def get_category_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractCategoryRepository:
    """Get category repository instance."""
    return SqlAlchemyCategoryRepository(session)


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
    """Build an :class:`EmailService` with the right transport for this environment.

    Selection rule (fail-safe to mock):
        - ``use_mock_email=True`` → :class:`LoggingSender` (dev/staging default)
        - ``use_mock_email=False`` AND ``resend_api_key`` set → :class:`ResendSender` (prod)
        - ``use_mock_email=False`` AND no ``resend_api_key`` → falls back to
          :class:`LoggingSender` to avoid a runtime crash on first send.

    Note: ``use_mock_email`` defaults to True in settings, so production
    deploys must explicitly set ``USE_MOCK_EMAIL=False`` AND provide a
    ``RESEND_API_KEY`` to actually deliver mail.
    """
    renderer = EmailTemplateRenderer()
    if settings.use_mock_email or not settings.resend_api_key:
        return EmailService(renderer, LoggingSender())
    return EmailService(
        renderer,
        ResendSender(
            api_key=settings.resend_api_key,
            from_email=settings.resend_from_email,
            from_name=settings.resend_from_name,
        ),
    )


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
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
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


async def get_current_auth_user_from_cookie(
    request: Request,
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
) -> User:
    """
    Get authenticated user from httpOnly cookie (OAuth flow).

    This dependency:
    1. Reads access_token from httpOnly cookie
    2. Verifies JWT and extracts user_id from token
    3. Fetches full User entity from database
    4. Returns User with tenant_id for multi-tenant operations

    Use this in protected endpoints that support OAuth cookie authentication.

    Returns:
        User entity with id, tenant_id, and roles

    Raises:
        HTTPException: If token invalid or user not found
    """
    from uuid import UUID

    from fastapi import HTTPException, status

    # Get token from cookie
    access_token = request.cookies.get("access_token")

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - no access token cookie",
        )

    # Verify token type
    try:
        payload = jwt_service.verify_token(access_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        ) from None

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

    # Load user roles (needed for role-based access control)
    from uuid import uuid4

    from prosell.domain.entities.role import Role, RoleType

    user_role_strings = await user_repository.get_user_roles(user_id)
    # Convert role strings to Role objects
    user_roles = [
        Role(
            id=uuid4(),  # ID doesn't matter for has_role check, only role_type matters
            role_type=RoleType(role_str),
            name=role_str.replace("_", " ").title(),
        )
        for role_str in user_role_strings
    ]
    user.roles = user_roles

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
        role_repository: Annotated[AbstractRoleRepository, Depends(get_role_repository)],
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
        role_repository: Annotated[AbstractRoleRepository, Depends(get_role_repository)],
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
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    password_service: Annotated[IPasswordService, Depends(get_password_service)],
    email_service: Annotated[AbstractEmailService, Depends(get_email_service)],
) -> RegisterUserUseCase:
    """Get RegisterUser use case instance."""
    from prosell.application.use_cases.auth.register_user import RegisterUserUseCase

    return RegisterUserUseCase(user_repository, password_service, email_service)


async def get_issue_user_session_use_case(
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
    session_repository: Annotated[AbstractSessionRepository, Depends(get_session_repository)],
    token_hasher: Annotated[ITokenHasher, Depends(get_token_hasher)],
) -> IssueUserSessionUseCase:
    """Get IssueUserSession use case instance."""
    return IssueUserSessionUseCase(user_repository, jwt_service, session_repository, token_hasher)


async def get_login_user_use_case(
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    password_service: Annotated[IPasswordService, Depends(get_password_service)],
    issue_session_use_case: Annotated[
        IssueUserSessionUseCase, Depends(get_issue_user_session_use_case)
    ],
) -> LoginUserUseCase:
    """Get LoginUser use case instance."""
    from prosell.application.use_cases.auth.login_user import LoginUserUseCase

    return LoginUserUseCase(user_repository, password_service, issue_session_use_case)


async def get_invite_dealer_owner_use_case(
    invitation_repository: Annotated[
        AbstractOrganizationInvitationRepository, Depends(get_organization_invitation_repository)
    ],
    email_service: Annotated[AbstractEmailService, Depends(get_email_service)],
) -> InviteDealerOwnerUseCase:
    """Get InviteDealerOwner use case instance."""
    return InviteDealerOwnerUseCase(invitation_repository, email_service)


async def get_create_dealer_organization_use_case(
    organization_repository: Annotated[
        AbstractOrganizationRepository, Depends(get_organization_repository)
    ],
    vertical_repository: Annotated[
        AbstractOrganizationVerticalRepository, Depends(get_organization_vertical_repository)
    ],
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    category_repository: Annotated[AbstractCategoryRepository, Depends(get_category_repository)],
    invite_dealer_owner_use_case: Annotated[
        InviteDealerOwnerUseCase, Depends(get_invite_dealer_owner_use_case)
    ],
) -> CreateDealerOrganizationUseCase:
    """Get CreateDealerOrganization use case instance."""
    from prosell.application.use_cases.organization.create_dealer_organization import (
        CreateDealerOrganizationUseCase,
    )

    return CreateDealerOrganizationUseCase(
        organization_repository,
        vertical_repository,
        user_repository,
        category_repository,
        invite_dealer_owner_use_case,
    )


async def get_accept_organization_invitation_use_case(
    invitation_repository: Annotated[
        AbstractOrganizationInvitationRepository, Depends(get_organization_invitation_repository)
    ],
    organization_repository: Annotated[
        AbstractOrganizationRepository, Depends(get_organization_repository)
    ],
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    role_repository: Annotated[AbstractRoleRepository, Depends(get_role_repository)],
    password_service: Annotated[IPasswordService, Depends(get_password_service)],
    issue_session_use_case: Annotated[
        IssueUserSessionUseCase, Depends(get_issue_user_session_use_case)
    ],
) -> AcceptOrganizationInvitationUseCase:
    """Get AcceptOrganizationInvitation use case instance."""
    from prosell.application.use_cases.organization.accept_organization_invitation import (
        AcceptOrganizationInvitationUseCase,
    )

    return AcceptOrganizationInvitationUseCase(
        invitation_repository,
        organization_repository,
        user_repository,
        role_repository,
        password_service,
        issue_session_use_case,
    )


async def get_refresh_token_use_case(
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    session_repository: Annotated[AbstractSessionRepository, Depends(get_session_repository)],
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
    token_hasher: Annotated[ITokenHasher, Depends(get_token_hasher)],
) -> AuthRefreshTokenUseCase:
    """Get RefreshToken use case instance."""
    from prosell.application.use_cases.auth.refresh_token import RefreshTokenUseCase

    return RefreshTokenUseCase(user_repository, session_repository, jwt_service, token_hasher)


async def get_oauth_login_use_case(
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    oauth_repository: Annotated[AbstractOAuthRepository, Depends(get_oauth_repository)],
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
) -> OAuthLoginUseCase:
    """Get OAuthLogin use case instance."""
    from prosell.application.use_cases.auth.oauth_login import OAuthLoginUseCase

    return OAuthLoginUseCase(user_repository, oauth_repository, jwt_service)


async def get_enable_2fa_use_case(
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    totp_service: Annotated[ITOTPService, Depends(get_totp_service)],
    email_service: Annotated[AbstractEmailService, Depends(get_email_service)],
) -> Enable2FAUseCase:
    """Get Enable2FA use case instance."""
    from prosell.application.use_cases.auth.enable_2fa import Enable2FAUseCase

    return Enable2FAUseCase(user_repository, totp_service, email_service)


async def get_disable_2fa_use_case(
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    totp_service: Annotated[ITOTPService, Depends(get_totp_service)],
) -> Disable2FAUseCase:
    """Get Disable2FA use case instance."""
    from prosell.application.use_cases.auth.enable_2fa import Disable2FAUseCase

    return Disable2FAUseCase(user_repository, totp_service)


async def get_verify_2fa_use_case(
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    session_repository: Annotated[AbstractSessionRepository, Depends(get_session_repository)],
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


async def get_change_password_use_case(
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    password_service: Annotated[IPasswordService, Depends(get_password_service)],
) -> ChangePasswordUseCase:
    """Get ChangePassword use case instance."""
    from prosell.application.use_cases.auth.change_password import ChangePasswordUseCase

    return ChangePasswordUseCase(user_repository, password_service)


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


def get_redis_service() -> IRedisService:
    """Get Redis service instance."""

    return RedisService()


async def get_facebook_authorize_use_case(
    oauth_service: Annotated[IFacebookMarketplaceOAuthService, Depends(get_facebook_oauth_service)],
    redis_service: Annotated[IRedisService, Depends(get_redis_service)],
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
    redis_service: Annotated[IRedisService, Depends(get_redis_service)],
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
    from prosell.application.use_cases.facebook.list_accounts import ListAccountsUseCase

    return ListAccountsUseCase(facebook_account_repository)


async def get_facebook_fetch_pages_use_case(
    facebook_page_repository: Annotated[
        IFacebookPageRepository, Depends(get_facebook_page_repository)
    ],
    facebook_account_repository: Annotated[
        IFacebookAccountRepository, Depends(get_facebook_account_repository)
    ],
) -> FetchPagesUseCase:
    """Get FetchPages use case instance."""
    from prosell.application.use_cases.facebook.fetch_pages import FetchPagesUseCase

    return FetchPagesUseCase(facebook_page_repository, facebook_account_repository)


async def get_facebook_set_default_use_case(
    facebook_page_repository: Annotated[
        IFacebookPageRepository, Depends(get_facebook_page_repository)
    ],
    facebook_account_repository: Annotated[
        IFacebookAccountRepository, Depends(get_facebook_account_repository)
    ],
) -> SetDefaultPageUseCase:
    """Get SetDefaultPage use case instance."""
    from prosell.application.use_cases.facebook.set_default_page import SetDefaultPageUseCase

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


# =============================================================================
# PUBLISHER DEPENDENCIES
# =============================================================================


async def get_publication_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> IPublicationRepository:
    """Get Publication repository instance."""
    from prosell.infrastructure.repositories.publication_repository_impl import (
        SqlAlchemyPublicationRepository,
    )

    return SqlAlchemyPublicationRepository(session)


def get_task_dispatcher() -> ITaskDispatcher:
    """Get background task dispatcher instance."""
    return TaskiqTaskDispatcher()


async def get_publish_vehicle_use_case(
    publication_repo: Annotated[IPublicationRepository, Depends(get_publication_repository)],
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    task_dispatcher: Annotated[ITaskDispatcher, Depends(get_task_dispatcher)],
) -> PublishVehicleUseCase:
    """Get PublishVehicle use case instance.

    Note: image processing happens inside the Taskiq task (Plan 03) — do NOT inject
    ImagePipelineService here.
    """
    from prosell.application.use_cases.publisher.publish_vehicle import PublishVehicleUseCase

    return PublishVehicleUseCase(
        publication_repo=publication_repo,
        seller_user_id=current_user.id,
        task_dispatcher=task_dispatcher,
    )


# =============================================================================
# USER-DEALER DEPENDENCIES
# =============================================================================


async def get_branch_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractBranchRepository:
    """Get Branch repository instance."""
    from prosell.infrastructure.repositories.branch_repository_impl import (
        SqlAlchemyBranchRepository,
    )

    return SqlAlchemyBranchRepository(session)


async def get_user_branch_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractUserBranchRepository:
    """Get UserBranch repository instance."""
    from prosell.infrastructure.repositories.user_branch_repository_impl import (
        SqlAlchemyUserBranchRepository,
    )

    return SqlAlchemyUserBranchRepository(session)


async def get_assign_user_branch_use_case(
    user_branch_repository: Annotated[
        AbstractUserBranchRepository, Depends(get_user_branch_repository)
    ],
    branch_repository: Annotated[AbstractBranchRepository, Depends(get_branch_repository)],
) -> AssignUserBranchUseCase:
    """Get AssignUserBranch use case instance."""
    from prosell.application.use_cases.user_branch.assign_user_branch import (
        AssignUserBranchUseCase,
    )

    return AssignUserBranchUseCase(
        user_branch_repository=user_branch_repository,
        branch_repository=branch_repository,
    )


async def get_bulk_assign_use_case(
    user_branch_repository: Annotated[
        AbstractUserBranchRepository, Depends(get_user_branch_repository)
    ],
) -> BulkAssignUseCase:
    """Get BulkAssign use case instance."""
    from prosell.application.use_cases.user_branch.bulk_assign import BulkAssignUseCase

    return BulkAssignUseCase(user_branch_repository=user_branch_repository)


async def get_remove_user_branch_use_case(
    user_branch_repository: Annotated[
        AbstractUserBranchRepository, Depends(get_user_branch_repository)
    ],
) -> RemoveUserBranchUseCase:
    """Get RemoveUserBranch use case instance."""
    from prosell.application.use_cases.user_branch.remove_user_branch import (
        RemoveUserBranchUseCase,
    )

    return RemoveUserBranchUseCase(user_branch_repository=user_branch_repository)
