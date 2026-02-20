"""DTOs for two-factor authentication."""

from uuid import UUID

from pydantic import BaseModel, Field

from prosell.application.dto.auth.common import UserInfo


class Enable2FARequest(BaseModel):
    """DTO for enabling 2FA."""

    user_id: UUID


class Enable2FAResponse(BaseModel):
    """DTO for 2FA enable response."""

    secret: str
    qr_code_uri: str
    backup_codes: list[str]
    message: str


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


class Disable2FARequest(BaseModel):
    """DTO for disabling 2FA."""

    user_id: UUID
    totp_code: str = Field(min_length=6, max_length=6)  # Verify with a code before disabling


class Disable2FAResponse(BaseModel):
    """DTO for 2FA disable response."""

    message: str
