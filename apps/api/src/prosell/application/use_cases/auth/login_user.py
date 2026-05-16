"""User login use case."""

import logging
import secrets

from prosell.application.dto.auth import LoginUserRequest, LoginUserResponse, UserInfo
from prosell.domain.exceptions.auth_exceptions import (
    AccountLockedException,
    EmailNotVerifiedException,
    InvalidCredentialsException,
)
from prosell.domain.ports import IJWTService, IPasswordService
from prosell.domain.repositories.user_repository import AbstractUserRepository

# Get logger instance
logger = logging.getLogger(__name__)

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
        logger.info(f"Attempting login for user: {request.email}")

        # 1. Get user by email
        logger.debug(f"Fetching user by email: {request.email}")
        user = await self.user_repository.get_by_email(request.email)
        if not user:
            logger.warning(f"Login failed: User not found for email {request.email}")
            # Don't reveal if email exists (security)
            raise InvalidCredentialsException()
        logger.debug(f"User found: {user.id}")

        # 2. Check if account is locked
        logger.debug(f"Checking account lock status for user {user.id}")
        if user.is_locked():
            logger.warning(f"Login failed: Account locked for user {user.id}")
            raise AccountLockedException("Account is temporarily locked. Please try again later.")
        logger.debug("Account is not locked.")

        # 3. Check if email is verified
        logger.debug(f"Checking email verification for user {user.id}")
        if not user.email_verified:
            logger.warning(f"Login failed: Email not verified for user {user.id}")
            raise EmailNotVerifiedException()
        logger.debug("Email is verified.")

        # 4. Verify password
        logger.info(f"[LOGIN-DEBUG] Verifying password for user {user.id}")
        logger.info(f"[LOGIN-DEBUG] Password hash exists: {bool(user.password_hash)}")
        logger.info(f"[LOGIN-DEBUG] Provided password: {request.password!r}")

        password_valid = False
        if user.password_hash:
            password_valid = self.password_service.verify_password(
                request.password,
                user.password_hash,
            )
            logger.info(f"[LOGIN-DEBUG] Password verification result: {password_valid}")

        if not password_valid:
            logger.warning(f"Login failed: Invalid password for user {user.id}")
            # Record failed attempt
            should_lock = user.record_failed_login()
            await self.user_repository.update(user)
            if should_lock:
                logger.error(f"Login failed: Account locked for user {user.id} after multiple attempts.")  # noqa: E501
                raise AccountLockedException("Account locked due to too many failed login attempts")
            raise InvalidCredentialsException()
        logger.debug("Password verified successfully.")

        # 5. Check if 2FA is enabled
        logger.debug(f"Checking 2FA status for user {user.id}")
        if user.is_2fa_enabled:
            logger.info(f"2FA enabled for user {user.id}. Initiating 2FA challenge.")
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
            logger.debug(f"Created temp 2FA token for user {user.id}")

            # Return the temp token as access_token (client will send it to /verify-2fa)
            return LoginUserResponse(
                access_token=temp_2fa_token,
                refresh_token="",  # Empty until 2FA is verified
                user=UserInfo(
                    id=str(user.id),
                    email=user.email,
                    full_name=user.full_name,
                    tenant_id=str(user.tenant_id),
                ),
                requires_2fa=True,
            )
        logger.debug("2FA not enabled.")

        # 6. Reset failed attempts
        logger.debug(f"Resetting failed login attempts for user {user.id}")
        user.reset_failed_attempts()

        # 7. Update last login
        user.update_last_login(request.ip_address)
        await self.user_repository.update(user)
        logger.debug(f"Updated last login for user {user.id}")

        # 8. Get user roles
        logger.debug(f"Fetching roles for user {user.id}")
        user_roles = await self.user_repository.get_user_roles(user.id)
        logger.debug(f"User roles fetched: {user_roles}")

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
        logger.debug("JWT access and refresh tokens generated.")

        logger.info(f"Login successful for user: {request.email}")
        return LoginUserResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserInfo(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                roles=user_roles,
                tenant_id=str(user.tenant_id),
            ),
            requires_2fa=False,
        )
