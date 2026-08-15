"""Marketplace access status enum - Pure domain value object."""

from enum import StrEnum


class MarketplaceAccessStatus(StrEnum):
    """Marketplace access grant status enum."""

    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"
    REVOKED = "revoked"

    def is_active(self) -> bool:
        """Check if status is active."""
        return self == MarketplaceAccessStatus.ACTIVE

    def is_pending(self) -> bool:
        """Check if status is pending approval."""
        return self == MarketplaceAccessStatus.PENDING

    def can_be_approved(self) -> bool:
        """Check if grant can be approved."""
        return self == MarketplaceAccessStatus.PENDING

    def can_be_rejected(self) -> bool:
        """Check if grant can be rejected."""
        return self == MarketplaceAccessStatus.PENDING

    def can_be_revoked(self) -> bool:
        """Check if grant can be revoked."""
        return self == MarketplaceAccessStatus.ACTIVE

    def __str__(self) -> str:
        return self.value
