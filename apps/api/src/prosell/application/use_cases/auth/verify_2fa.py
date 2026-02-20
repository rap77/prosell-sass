"""Verify 2FA code use case."""

from uuid import UUID

from pydantic import BaseModel, Field

from prosell.domain.entities.session import Session
from prosell.domain.exceptions.auth_exceptions import (
    Invalid2FACodeException,
    UserNotFoundException,
)
from prosell.domain.ports import IJWTService, ITokenHasher, ITOTPService
from prosell.domain.repositories.session_repository import AbstractSessionRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository


class UserInfo(BaseModel):
    """User info nested model."""

    id: str
    email: str
    full_name: str
    roles: list[str] = []


class Verify2FARequest(BaseModel):
    """DTO for 2FA verification."""

    user_id: UUID
    code: str = Field(min_length=6, max_length=6)
    ip_address: str | None = None
    user_agent: str | None = None


class Verify2FAResponse(BaseModel):
    """DTO for 2FA verification response."""

    access_token: str
    refresh_token: str
    user: UserInfo


class Verify2FAUseCase:
    """Use case for verifying 2FA code during login."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        session_repository: AbstractSessionRepository,
        totp_service: ITOTPService,
        jwt_service: IJWTService,
        token_hasher: ITokenHasher,
    ) -> None:
        self.user_repository = user_repository
        self.session_repository = session_repository
        self.totp_service = totp_service
        self.jwt_service = jwt_service
        self.token_hasher = token_hasher

    async def execute(self, request: Verify2FARequest) -> Verify2FAResponse:
        """
        Execute 2FA verification.

        Args:
            request: 2FA verification request DTO

        Returns:
            Token response DTO

        Raises:
            Invalid2FACodeException: If code is invalid
        """
        # 1. Get user
        user = await self.user_repository.get_by_id(request.user_id)
        if not user:
            raise UserNotFoundException(user_id=str(request.user_id))

        # 2. Check if 2FA is enabled
        if not user.is_2fa_enabled or not user.totp_secret:
            raise ValueError("2FA is not enabled for this account")

        # 3. Try TOTP code first
        is_valid = self.totp_service.verify_code(user.totp_secret, request.code)

        # 4. If TOTP fails, try backup codes
        if not is_valid:
            if user.backup_codes and request.code in user.backup_codes:
                user.use_backup_code(request.code)
                is_valid = True
                await self.user_repository.update(user)

        if not is_valid:
            raise Invalid2FACodeException()

        # 5. Get user roles
        user_roles = await self.user_repository.get_user_roles(user.id)

        # 6. Generate tokens
        access_token = self.jwt_service.generate_access_token(user.id, user_roles)
        refresh_token = self.jwt_service.generate_refresh_token(user.id)

        # 7. Create session
        token_hash = self.token_hasher.hash(refresh_token)
        session = Session.create(
            user_id=user.id,
            token_hash=token_hash,
            user_agent=request.user_agent,
            ip_address=request.ip_address,
        )
        await self.session_repository.create(session)

        # 8. Update last login
        user.update_last_login(request.ip_address)
        await self.user_repository.update(user)

        return Verify2FAResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserInfo(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                roles=user_roles,
            ),
        )
