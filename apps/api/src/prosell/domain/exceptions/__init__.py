"""Domain exceptions for ProSell SaaS."""

from prosell.domain.exceptions.appointment_exceptions import (
    AppointmentConflictException,
    AppointmentError,
    AppointmentNotFoundException,
    AppointmentTimeValidationException,
)
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
    OAuthCallbackError,
    OAuthConfigurationError,
    OAuthEmailMismatchException,
    OAuthProviderNotSupportedError,
    OAuthStateInvalidError,
    PasswordReuseException,
    TwoFactorNotEnabledException,
    UserNotFoundException,
    # Password exceptions
    WeakPasswordException,
)
from prosell.domain.exceptions.category_exceptions import (
    CategoryAlreadyExistsError,
    CategoryCircularReferenceError,
    CategoryError,
    CategoryNotFoundError,
)
from prosell.domain.exceptions.lead_exceptions import (
    DuplicateLeadException,
    LeadError,
    LeadNotFoundException,
    LeadStateTransitionException,
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
from prosell.domain.exceptions.product_exceptions import (
    InvalidVINError,
    ProductAlreadyExistsError,
    ProductError,
    ProductInvalidStatusTransitionError,
    ProductNotEditableError,
    ProductNotFoundError,
    VehicleAlreadyExistsError,
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
    # Category exceptions
    "CategoryAlreadyExistsError",
    "CategoryCircularReferenceError",
    "CategoryError",
    "CategoryNotFoundError",
    # Appointment exceptions
    "AppointmentError",
    "AppointmentNotFoundException",
    "AppointmentTimeValidationException",
    "AppointmentConflictException",
    # Lead exceptions
    "LeadError",
    "LeadNotFoundException",
    "LeadStateTransitionException",
    "DuplicateLeadException",
    # Product exceptions
    "ProductError",
    "ProductNotFoundError",
    "ProductAlreadyExistsError",
    "ProductInvalidStatusTransitionError",
    "ProductNotEditableError",
    "VehicleAlreadyExistsError",
    "InvalidVINError",
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
    "PasswordReuseException",
    # 2FA exceptions
    "Invalid2FACodeException",
    "TwoFactorNotEnabledException",
    "BackupCodesExhaustedException",
    # OAuth exceptions
    "OAuthAccountExistsException",
    "OAuthCallbackError",
    "OAuthConfigurationError",
    "OAuthEmailMismatchException",
    "OAuthProviderNotSupportedError",
    "OAuthStateInvalidError",
]
