"""Enable 2FA use case."""

from uuid import UUID

from pydantic import BaseModel, Field

from prosell.application.ports.email_service import AbstractEmailService
from prosell.domain.exceptions.auth_exceptions import UserNotFoundException
from prosell.domain.ports import ITOTPService
from prosell.domain.repositories.user_repository import AbstractUserRepository


class Enable2FARequest(BaseModel):
    """DTO for enabling 2FA."""

    user_id: UUID


class Enable2FAResponse(BaseModel):
    """DTO for 2FA enable response."""

    secret: str
    qr_code_uri: str
    backup_codes: list[str]
    message: str


class Enable2FAUseCase:
    """Use case for enabling two-factor authentication."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        totp_service: ITOTPService,
        email_service: AbstractEmailService,
    ) -> None:
        self.user_repository = user_repository
        self.totp_service = totp_service
        self.email_service = email_service

    async def execute(self, request: Enable2FARequest) -> Enable2FAResponse:
        """
        Execute 2FA enable.

        Args:
            request: 2FA enable request DTO

        Returns:
            2FA enable response DTO with secret and backup codes
        """
        # 1. Get user
        user = await self.user_repository.get_by_id(request.user_id)
        if not user:
            raise UserNotFoundException(user_id=str(request.user_id))

        # 2. Generate TOTP secret
        secret = self.totp_service.generate_secret()

        # 3. Generate QR code URI
        qr_code_uri = self.totp_service.generate_qr_code_uri(user.email, secret)

        # 4. Generate backup codes
        backup_codes = self.totp_service.generate_backup_codes()

        # 5. Enable 2FA on user
        user.enable_2fa(secret, backup_codes)
        await self.user_repository.update(user)

        # 6. Send notification email
        await self.email_service.send_2fa_enabled(user.email)

        return Enable2FAResponse(
            secret=secret,
            qr_code_uri=qr_code_uri,
            backup_codes=backup_codes,
            message="2FA enabled. Save your backup codes securely!",
        )


class Disable2FARequest(BaseModel):
    """DTO for disabling 2FA."""

    user_id: UUID
    totp_code: str = Field(min_length=6, max_length=6)  # Verify with a code before disabling


class Disable2FAResponse(BaseModel):
    """DTO for 2FA disable response."""

    message: str


class Disable2FAUseCase:
    """Use case for disabling two-factor authentication."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        totp_service: ITOTPService,
    ) -> None:
        self.user_repository = user_repository
        self.totp_service = totp_service

    async def execute(self, request: Disable2FARequest) -> Disable2FAResponse:
        """
        Execute 2FA disable.

        Args:
            request: 2FA disable request DTO

        Returns:
            2FA disable response DTO
        """
        # 1. Get user
        user = await self.user_repository.get_by_id(request.user_id)
        if not user:
            raise UserNotFoundException(user_id=str(request.user_id))

        # 2. Verify TOTP code
        if not user.totp_secret:
            raise ValueError("2FA is not enabled")

        if not self.totp_service.verify_code(user.totp_secret, request.totp_code):
            raise ValueError("Invalid 2FA code")

        # 3. Disable 2FA
        user.disable_2fa()
        await self.user_repository.update(user)

        return Disable2FAResponse(
            message="2FA disabled successfully",
        )
