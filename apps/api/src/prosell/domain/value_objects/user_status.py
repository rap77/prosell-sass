"""User status value object."""

from enum import Enum


class UserStatus(str, Enum):
    """User account status."""

    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    SUSPENDED = "suspended"

    def is_active(self) -> bool:
        """Check if status is active."""
        return self == UserStatus.ACTIVE

    def can_login(self) -> bool:
        """Check if user with this status can login."""
        return self == UserStatus.ACTIVE

    def __str__(self) -> str:
        return self.value
