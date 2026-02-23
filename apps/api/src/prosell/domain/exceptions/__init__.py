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
from prosell.domain.exceptions.org_exceptions import (
    InsufficientFundsException,
    OrganizationAlreadyExistsException,
    OrganizationNotActiveException,
    OrganizationNotFoundException,
    OrganizationVerificationException,
    OrgDomainException,
    TeamAlreadyExistsException,
    TeamMemberNotFoundException,
    TeamNotFoundException,
    WalletNotFoundException,
)

__all__ = [
    # Org exceptions
    "OrgDomainException",
    "OrganizationNotFoundException",
    "OrganizationAlreadyExistsException",
    "OrganizationNotActiveException",
    "OrganizationVerificationException",
    "TeamNotFoundException",
    "TeamAlreadyExistsException",
    "TeamMemberNotFoundException",
    "WalletNotFoundException",
    "InsufficientFundsException",
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
