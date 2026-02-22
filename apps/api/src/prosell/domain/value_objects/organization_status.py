"""Organization status value object."""

from enum import StrEnum


class OrganizationStatus(StrEnum):
    """Organization status enum.

    Represents the lifecycle state of an organization:
    - PENDING_VERIFICATION: New org awaiting admin verification
    - ACTIVE: Verified organization with full access
    - SUSPENDED: Temporarily suspended (e.g., payment issue, violation)
    - REJECTED: Verification failed (permanent state)
    """

    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REJECTED = "rejected"

    def is_active(self) -> bool:
        """Check if status is active."""
        return self == OrganizationStatus.ACTIVE

    def can_operate(self) -> bool:
        """Check if organization can operate (active or pending)."""
        return self in (
            OrganizationStatus.ACTIVE,
            OrganizationStatus.PENDING_VERIFICATION,
        )

    def is_suspended(self) -> bool:
        """Check if status is suspended."""
        return self == OrganizationStatus.SUSPENDED

    def __str__(self) -> str:
        return self.value
