"""Dependency injection container for FastAPI."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.ports.email_service import AbstractEmailService
from prosell.core.config import settings
from prosell.domain.ports import (
    IJWTService,
    IPasswordService,
    ITokenHasher,
    ITOTPService,
)
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
from prosell.infrastructure.services.password_service import PasswordService
from prosell.infrastructure.services.totp_service import TOTPService

# =============================================================================
# REPOSITORY FACTORIES
# =============================================================================


async def get_user_repository(
    session: AsyncSession = Depends(get_async_session),
) -> SqlAlchemyUserRepository:
    """Get user repository instance."""
    return SqlAlchemyUserRepository(session)


async def get_role_repository(
    session: AsyncSession = Depends(get_async_session),
) -> SqlAlchemyRoleRepository:
    """Get role repository instance."""
    return SqlAlchemyRoleRepository(session)


async def get_session_repository(
    session: AsyncSession = Depends(get_async_session),
) -> SqlAlchemySessionRepository:
    """Get session repository instance."""
    return SqlAlchemySessionRepository(session)


async def get_oauth_repository(
    session: AsyncSession = Depends(get_async_session),
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


# =============================================================================
# USE CASE FACTORIES
# =============================================================================


async def get_register_user_use_case(
    user_repository: SqlAlchemyUserRepository = Depends(get_user_repository),
    password_service: IPasswordService = Depends(get_password_service),
    email_service: AbstractEmailService = Depends(get_email_service),
):
    """Get RegisterUser use case instance."""
    from prosell.application.use_cases.auth.register_user import RegisterUserUseCase

    return RegisterUserUseCase(user_repository, password_service, email_service)


async def get_login_user_use_case(
    user_repository: SqlAlchemyUserRepository = Depends(get_user_repository),
    password_service: IPasswordService = Depends(get_password_service),
    jwt_service: IJWTService = Depends(get_jwt_service),
):
    """Get LoginUser use case instance."""
    from prosell.application.use_cases.auth.login_user import LoginUserUseCase

    return LoginUserUseCase(user_repository, password_service, jwt_service)


async def get_refresh_token_use_case(
    user_repository: SqlAlchemyUserRepository = Depends(get_user_repository),
    session_repository: SqlAlchemySessionRepository = Depends(get_session_repository),
    jwt_service: IJWTService = Depends(get_jwt_service),
    token_hasher: ITokenHasher = Depends(get_token_hasher),
):
    """Get RefreshToken use case instance."""
    from prosell.application.use_cases.auth.refresh_token import RefreshTokenUseCase

    return RefreshTokenUseCase(user_repository, session_repository, jwt_service, token_hasher)


async def get_oauth_login_use_case(
    user_repository: SqlAlchemyUserRepository = Depends(get_user_repository),
    oauth_repository: SqlAlchemyOAuthRepository = Depends(get_oauth_repository),
    jwt_service: IJWTService = Depends(get_jwt_service),
):
    """Get OAuthLogin use case instance."""
    from prosell.application.use_cases.auth.oauth_login import OAuthLoginUseCase

    return OAuthLoginUseCase(user_repository, oauth_repository, jwt_service)


async def get_enable_2fa_use_case(
    user_repository: SqlAlchemyUserRepository = Depends(get_user_repository),
    totp_service: ITOTPService = Depends(get_totp_service),
    email_service: AbstractEmailService = Depends(get_email_service),
):
    """Get Enable2FA use case instance."""
    from prosell.application.use_cases.auth.enable_2fa import Enable2FAUseCase

    return Enable2FAUseCase(user_repository, totp_service, email_service)


async def get_disable_2fa_use_case(
    user_repository: SqlAlchemyUserRepository = Depends(get_user_repository),
    totp_service: ITOTPService = Depends(get_totp_service),
):
    """Get Disable2FA use case instance."""
    from prosell.application.use_cases.auth.enable_2fa import Disable2FAUseCase

    return Disable2FAUseCase(user_repository, totp_service)


async def get_verify_2fa_use_case(
    user_repository: SqlAlchemyUserRepository = Depends(get_user_repository),
    session_repository: SqlAlchemySessionRepository = Depends(get_session_repository),
    totp_service: ITOTPService = Depends(get_totp_service),
    jwt_service: IJWTService = Depends(get_jwt_service),
    token_hasher: ITokenHasher = Depends(get_token_hasher),
):
    """Get Verify2FA use case instance."""
    from prosell.application.use_cases.auth.verify_2fa import Verify2FAUseCase

    return Verify2FAUseCase(
        user_repository,
        session_repository,
        totp_service,
        jwt_service,
        token_hasher,
    )
