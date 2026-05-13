"""Facebook Marketplace OAuth domain exceptions.

These exceptions are specific to Facebook OAuth for Marketplace integration,
separate from authentication OAuth.
"""

from prosell.domain.exceptions.auth_exceptions import AuthDomainException


class FacebookDomainException(AuthDomainException):
    """Base exception for Facebook Marketplace domain errors."""

    def __init__(self, message: str, details: dict[str, str | list[str]] | None = None) -> None:
        self.message: str = message
        self.details: dict[str, str | list[str]] = details or {}
        super().__init__(message)


# Account Exceptions


class FacebookAccountNotFoundException(FacebookDomainException):
    """Raised when Facebook account is not found."""

    def __init__(self, account_id: str) -> None:
        super().__init__(
            message=f"Facebook account not found: {account_id}",
            details={"account_id": account_id},
        )


class FacebookAccountAlreadyExistsException(FacebookDomainException):
    """Raised when Facebook account already exists for this user."""

    def __init__(self, seller_user_id: str, facebook_user_id: str) -> None:
        super().__init__(
            message="Facebook account already connected",
            details={
                "seller_user_id": seller_user_id,
                "facebook_user_id": facebook_user_id,
            },
        )


class FacebookAccountExpiredException(FacebookDomainException):
    """Raised when attempting to use an expired Facebook account."""

    def __init__(self, account_id: str) -> None:
        super().__init__(
            message=f"Facebook account token is expired: {account_id}",
            details={"account_id": account_id},
        )


class FacebookAccountRevokedException(FacebookDomainException):
    """Raised when attempting to use a revoked Facebook account."""

    def __init__(self, account_id: str) -> None:
        super().__init__(
            message=f"Facebook account permissions were revoked: {account_id}",
            details={"account_id": account_id},
        )


# OAuth Flow Exceptions


class FacebookOAuthException(FacebookDomainException):
    """Raised when Facebook OAuth flow fails."""

    def __init__(self, reason: str = "unknown") -> None:
        super().__init__(
            message=f"Facebook OAuth failed: {reason}",
            details={"reason": reason},
        )


class FacebookStateException(FacebookDomainException):
    """Raised when OAuth state token is invalid or expired."""

    def __init__(self) -> None:
        super().__init__(
            message="Invalid or expired Facebook OAuth state token",
            details={},
        )


class FacebookTokenExchangeException(FacebookOAuthException):
    """Raised when Facebook token exchange fails."""

    def __init__(self, reason: str = "token_exchange_failed") -> None:
        super().__init__(reason=reason)


class FacebookUserInfoFetchException(FacebookOAuthException):
    """Raised when Facebook user info fetch fails."""

    def __init__(self, reason: str = "user_info_fetch_failed") -> None:
        super().__init__(reason=reason)


class FacebookTokenRefreshException(FacebookDomainException):
    """Raised when Facebook token refresh fails."""

    def __init__(self, account_id: str, reason: str = "unknown") -> None:
        super().__init__(
            message=f"Failed to refresh token for account {account_id}: {reason}",
            details={"account_id": account_id, "reason": reason},
        )


# Page Exceptions


class FacebookPageNotFoundException(FacebookDomainException):
    """Raised when Facebook page is not found."""

    def __init__(self, page_id: str) -> None:
        super().__init__(
            message=f"Facebook page not found: {page_id}",
            details={"page_id": page_id},
        )


class FacebookPageFetchException(FacebookDomainException):
    """Raised when Facebook page fetch fails."""

    def __init__(self, reason: str = "unknown") -> None:
        super().__init__(
            message=f"Failed to fetch Facebook pages: {reason}",
            details={"reason": reason},
        )


# Permission Exceptions


class InsufficientFacebookPermissionsException(FacebookDomainException):
    """Raised when Facebook account lacks required permissions."""

    def __init__(self, required: list[str], granted: list[str]) -> None:
        super().__init__(
            message="Insufficient Facebook permissions for Marketplace publishing",
            details={
                "required": required,
                "granted": granted,
                "missing": [p for p in required if p not in granted],
            },
        )


# Configuration Exceptions


class FacebookNotConfiguredException(FacebookDomainException):
    """Raised when Facebook OAuth is not configured."""

    def __init__(self, missing: str) -> None:
        super().__init__(
            message=f"Facebook OAuth not configured: missing {missing}",
            details={"missing": missing},
        )


# Rate Limiting Exceptions


class FacebookRateLimitException(FacebookDomainException):
    """Raised when Facebook Graph API rate limit is exceeded."""

    def __init__(self, retry_after: int | None = None) -> None:
        """Initialize rate limit exception.

        Args:
            retry_after: Seconds to wait before retrying (from Retry-After header)
        """
        super().__init__(
            message="Facebook Graph API rate limit exceeded",
            details={"retry_after": str(retry_after)} if retry_after is not None else {},
        )
        self.retry_after = retry_after
