"""Auth DTOs for application layer.

This module contains all Data Transfer Objects (DTOs) for authentication-related
use cases, organized by functionality per Clean Architecture principles.

Import example:
    from prosell.application.dto.auth import (
        RegisterUserRequest,
        RegisterUserResponse,
        LoginUserRequest,
        LoginUserResponse,
    )
"""

# Common DTOs
from uuid import UUID

from prosell.application.dto.auth.common import UserInfo

# Email
from prosell.application.dto.auth.email import VerifyEmailRequest, VerifyEmailResponse

# Login
from prosell.application.dto.auth.login import LoginUserRequest, LoginUserResponse

# OAuth
from prosell.application.dto.auth.oauth import OAuthLoginRequest, OAuthLoginResponse

# Password
from prosell.application.dto.auth.password import (
    RequestPasswordResetRequest,
    RequestPasswordResetResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)

# Register
from prosell.application.dto.auth.register import (
    RegisterUserRequest,
    RegisterUserResponse,
)

# Token refresh
from prosell.application.dto.auth.token import (
    RefreshTokenRequest,
    RefreshTokenResponse,
)

# 2FA
from prosell.application.dto.auth.two_factor import (
    Disable2FARequest,
    Disable2FAResponse,
    Enable2FARequest,
    Enable2FAResponse,
    Verify2FARequest,
    Verify2FAResponse,
)

# Re-export UUID for use in DTOs
__all__ = ["UUID"]
__all__ += ["UserInfo"]
__all__ += ["VerifyEmailRequest", "VerifyEmailResponse"]
__all__ += ["LoginUserRequest", "LoginUserResponse"]
__all__ += ["OAuthLoginRequest", "OAuthLoginResponse"]
__all__ += ["RegisterUserRequest", "RegisterUserResponse"]
__all__ += [
    "RequestPasswordResetRequest",
    "RequestPasswordResetResponse",
    "ResetPasswordRequest",
    "ResetPasswordResponse",
]
__all__ += ["RefreshTokenRequest", "RefreshTokenResponse"]
__all__ += [
    "Disable2FARequest",
    "Disable2FAResponse",
    "Enable2FARequest",
    "Enable2FAResponse",
    "Verify2FARequest",
    "Verify2FAResponse",
]
