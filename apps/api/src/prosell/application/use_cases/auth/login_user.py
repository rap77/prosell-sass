"""User login use case."""

import secrets

from prosell.application.dto.auth import LoginUserRequest, LoginUserResponse, UserInfo
from prosell.domain.exceptions.auth_exceptions import (
    AccountLockedException,
    EmailNotVerifiedException,
    InvalidCredentialsException,
)
from prosell.domain.ports import IJWTService, IPasswordService
from prosell.domain.repositories.user_repository import AbstractUserRepository


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
            # Generate a temporary token for 2FA verification
            # This token expires in 5 minutes and only identifies the user
            temp_2fa_token = secrets.token_urlsafe(32)

            # Store temp token for 2FA verification
            await self.user_repository.create_verification_token(
                user_id=user.id,
                token=temp_2fa_token,
                token_type="2fa_temp",
                expires_in_minutes=5,  # Short expiration for security
            )

            # Return the temp token as access_token (client will send it to /verify-2fa)
            return LoginUserResponse(
                access_token=temp_2fa_token,
                refresh_token="",  # Empty until 2FA is verified
                user=UserInfo(
                    id=str(user.id),
                    email=user.email,
                    full_name=user.full_name,
                ),
                requires_2fa=True,
            )

        # 6. Reset failed attempts
        user.reset_failed_attempts()

        # 7. Update last login
        user.update_last_login(request.ip_address)
        await self.user_repository.update(user)

        # 8. Get user roles
        user_roles = await self.user_repository.get_user_roles(user.id)

        # 9. Generate tokens (include user data in access token for frontend convenience)
        # Parse full_name into first_name and last_name
        name_parts = user.full_name.split(" ", 1) if user.full_name else ["", ""]
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        access_token = self.jwt_service.generate_access_token(
            user.id,
            user_roles,
            email=user.email,
            first_name=first_name,
            last_name=last_name,
        )
        refresh_token = self.jwt_service.generate_refresh_token(user.id)

        return LoginUserResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserInfo(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                roles=user_roles,
            ),
            requires_2fa=False,
        )
