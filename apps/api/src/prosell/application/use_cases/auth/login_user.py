"""User login use case."""

from dataclasses import dataclass

from prosell.domain.exceptions.auth_exceptions import (
    AccountLockedException,
    EmailNotVerifiedException,
    InvalidCredentialsException,
)
from prosell.domain.ports import IJWTService, IPasswordService
from prosell.domain.repositories.user_repository import AbstractUserRepository


@dataclass
class LoginUserRequest:
    """DTO for login request."""

    email: str
    password: str
    remember_me: bool = False
    ip_address: str | None = None
    user_agent: str | None = None


@dataclass
class LoginUserResponse:
    """DTO for login response."""

    access_token: str
    refresh_token: str
    user: dict
    requires_2fa: bool = False


class LoginUserUseCase:
    """Use case for user login."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        password_service: IPasswordService,
        jwt_service: IJWTService,
    ) -> None:
        self.user_repository = user_repository
        self.password_service = password_service
        self.jwt_service = jwt_service

    async def execute(self, request: LoginUserRequest) -> LoginUserResponse:
        """
        Execute user login.

        Args:
            request: Login request DTO

        Returns:
            Login response DTO

        Raises:
            InvalidCredentialsException: If credentials are invalid
            AccountLockedException: If account is locked
            EmailNotVerifiedException: If email is not verified
        """
        # 1. Get user by email
        user = await self.user_repository.get_by_email(request.email)
        if not user:
            # Don't reveal if email exists (security)
            raise InvalidCredentialsException()

        # 2. Check if account is locked
        if user.is_locked():
            raise AccountLockedException("Account is temporarily locked. Please try again later.")

        # 3. Check if email is verified
        if not user.email_verified:
            raise EmailNotVerifiedException()

        # 4. Verify password
        if not user.password_hash or not self.password_service.verify_password(
            request.password,
            user.password_hash,
        ):
            # Record failed attempt
            should_lock = user.record_failed_login()
            await self.user_repository.update(user)
            if should_lock:
                raise AccountLockedException("Account locked due to too many failed login attempts")
            raise InvalidCredentialsException()

        # 5. Check if 2FA is enabled
        if user.is_2fa_enabled:
            # Note: In a full implementation, we'd return a temp token
            # For now, we'll require 2FA in a separate step
            return LoginUserResponse(
                access_token="",  # Empty for 2FA flow
                refresh_token="",
                user={
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                },
                requires_2fa=True,
            )

        # 6. Reset failed attempts
        user.reset_failed_attempts()

        # 7. Update last login
        user.update_last_login(request.ip_address)
        await self.user_repository.update(user)

        # 8. Get user roles
        user_roles = await self.user_repository.get_user_roles(user.id)

        # 9. Generate tokens
        access_token = self.jwt_service.generate_access_token(user.id, user_roles)
        refresh_token = self.jwt_service.generate_refresh_token(user.id)

        return LoginUserResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "roles": user_roles,
            },
            requires_2fa=False,
        )
