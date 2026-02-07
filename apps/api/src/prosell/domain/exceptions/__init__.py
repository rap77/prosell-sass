"""Domain exceptions for ProSell SaaS."""

from prosell.domain.exceptions.auth_exceptions import (
    AccountLockedException,
    BackupCodesExhaustedException,
    DisposableEmailException,
    # User exceptions
    EmailAlreadyExistsException,
    EmailNotVerifiedException,
    # 2FA exceptions
    Invalid2FACodeException,
    InvalidCredentialsException,
    InvalidEmailFormatException,
    InvalidPasswordResetTokenException,
    # OAuth exceptions
    OAuthAccountExistsException,
    OAuthEmailMismatchException,
    UserNotFoundException,
    # Password exceptions
    WeakPasswordException,
)

__all__ = [
    # User exceptions
    "EmailAlreadyExistsException",
    "UserNotFoundException",
    "InvalidCredentialsException",
    "EmailNotVerifiedException",
    "AccountLockedException",
    "InvalidEmailFormatException",
    "DisposableEmailException",
    # Password exceptions
    "WeakPasswordException",
    "InvalidPasswordResetTokenException",
    # 2FA exceptions
    "Invalid2FACodeException",
    "BackupCodesExhaustedException",
    # OAuth exceptions
    "OAuthAccountExistsException",
    "OAuthEmailMismatchException",
]
