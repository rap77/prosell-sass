"""Authentication-related domain exceptions."""


# User Exceptions


class AuthDomainException(Exception):
    """Base exception for auth domain errors."""

    def __init__(self, message: str, details: dict | None = None):
        self.message = message
        self.details = details or {}
        super().__init__(message)


class EmailAlreadyExistsException(AuthDomainException):
    """Raised when trying to register with an existing email."""

    def __init__(self, email: str):
        super().__init__(
            message=f"An account with email '{email}' already exists",
            details={"email": email},
        )


class UserNotFoundException(AuthDomainException):
    """Raised when user is not found."""

    def __init__(self, user_id: str | None = None, email: str | None = None):
        if email:
            message = f"No account found with email '{email}'"
            details = {"email": email}
        elif user_id:
            message = f"No account found with ID '{user_id}'"
            details = {"user_id": user_id}
        else:
            message = "User not found"
            details = {}

        super().__init__(message=message, details=details)


class InvalidCredentialsException(AuthDomainException):
    """Raised when login credentials are invalid."""

    def __init__(self):
        super().__init__(
            message="Invalid email or password",
        )


class EmailNotVerifiedException(AuthDomainException):
    """Raised when trying to login with unverified email."""

    def __init__(self):
        super().__init__(
            message="Please verify your email address before logging in",
        )


class AccountLockedException(AuthDomainException):
    """Raised when account is locked due to failed attempts."""

    def __init__(self, locked_until: str | None = None):
        if locked_until:
            message = f"Account is temporarily locked. Please try again after {locked_until}"
        else:
            message = "Account is temporarily locked due to too many failed login attempts"

        super().__init__(message=message)


class InvalidEmailFormatException(AuthDomainException):
    """Raised when email format is invalid."""

    def __init__(self, email: str):
        super().__init__(
            message=f"Invalid email format: '{email}'",
            details={"email": email},
        )


class DisposableEmailException(AuthDomainException):
    """Raised when trying to use a disposable email domain."""

    def __init__(self, email: str):
        super().__init__(
            message=f"Disposable email domains are not allowed: '{email}'",
            details={"email": email},
        )


# Password Exceptions


class WeakPasswordException(AuthDomainException):
    """Raised when password doesn't meet security requirements."""

    def __init__(self, reasons: list[str]):
        super().__init__(
            message="Password does not meet security requirements",
            details={"reasons": reasons},
        )


class InvalidPasswordResetTokenException(AuthDomainException):
    """Raised when password reset token is invalid or expired."""

    def __init__(self):
        super().__init__(
            message="Invalid or expired password reset token",
        )


# 2FA Exceptions


class Invalid2FACodeException(AuthDomainException):
    """Raised when 2FA code is invalid."""

    def __init__(self):
        super().__init__(
            message="Invalid two-factor authentication code",
        )


class BackupCodesExhaustedException(AuthDomainException):
    """Raised when all backup codes have been used."""

    def __init__(self):
        super().__init__(
            message="All backup codes have been used. Please reconfigure 2FA",
        )


# OAuth Exceptions


class OAuthAccountExistsException(AuthDomainException):
    """Raised when OAuth account already linked to another user."""

    def __init__(self, provider: str, provider_user_id: str):
        super().__init__(
            message=f"This {provider} account is already linked to another user",
            details={"provider": provider, "provider_user_id": provider_user_id},
        )


class OAuthEmailMismatchException(AuthDomainException):
    """Raised when OAuth email doesn't match expected email."""

    def __init__(self, oauth_email: str, expected_email: str):
        super().__init__(
            message=f"OAuth email ({oauth_email}) doesn't match expected email ({expected_email})",
            details={"oauth_email": oauth_email, "expected_email": expected_email},
        )
