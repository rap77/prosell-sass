"""MarketplaceAccessGrant entity - Pure domain logic with no external dependencies."""

from datetime import UTC, datetime
from uuid import UUID

from prosell.domain.base import DomainModel, Field
from prosell.domain.value_objects.marketplace_access_status import MarketplaceAccessStatus


class MarketplaceAccessGrant(DomainModel):
    """
    Marketplace Access Grant entity.

    Represents a cross-organization authorization where one org (inventory owner)
    grants another org (operator) permission to publish/manage their inventory.

    Pure domain logic - no external dependencies.
    All business rules for marketplace access live here.
    """

    # Required fields
    id: UUID
    inventory_owner_organization_id: UUID
    operator_organization_id: UUID

    # Permissions
    can_publish_marketplace: bool = True
    can_manage_inventory: bool = False

    # Status and lifecycle
    status: MarketplaceAccessStatus = MarketplaceAccessStatus.PENDING
    requested_by_user_id: UUID | None = None
    approved_by_user_id: UUID | None = None
    rejected_by_user_id: UUID | None = None
    revoked_by_user_id: UUID | None = None

    # Timestamps
    requested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    approved_at: datetime | None = None
    rejected_at: datetime | None = None
    revoked_at: datetime | None = None

    # Audit details
    rejection_reason: str | None = None
    revocation_reason: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        id: UUID,
        inventory_owner_organization_id: UUID,
        operator_organization_id: UUID,
        requested_by_user_id: UUID,
        can_publish_marketplace: bool = True,
        can_manage_inventory: bool = False,
    ) -> "MarketplaceAccessGrant":
        """
        Factory method for new marketplace access request.

        Creates a new grant in PENDING status.

        Args:
            id: Unique grant identifier
            inventory_owner_organization_id: Org that owns the inventory
            operator_organization_id: Org requesting access to operate
            requested_by_user_id: User who created the request
            can_publish_marketplace: Permission to publish to marketplace
            can_manage_inventory: Permission to manage inventory

        Returns:
            New MarketplaceAccessGrant entity
        """
        now = datetime.now(UTC)
        return cls(
            id=id,
            inventory_owner_organization_id=inventory_owner_organization_id,
            operator_organization_id=operator_organization_id,
            requested_by_user_id=requested_by_user_id,
            can_publish_marketplace=can_publish_marketplace,
            can_manage_inventory=can_manage_inventory,
            status=MarketplaceAccessStatus.PENDING,
            requested_at=now,
            created_at=now,
            updated_at=now,
        )

    def approve(self, approver_id: UUID) -> None:
        """
        Approve pending grant - transitions to ACTIVE status.

        Args:
            approver_id: User ID performing the approval

        Raises:
            ValueError: If grant is not in PENDING status
        """
        if not self.status.can_be_approved():
            raise ValueError(
                f"Cannot approve {self.status} grant; only pending grants can be approved"
            )

        now = datetime.now(UTC)
        self.status = MarketplaceAccessStatus.ACTIVE
        self.approved_by_user_id = approver_id
        self.approved_at = now
        self.updated_at = now

    def reject(self, rejecter_id: UUID, reason: str) -> None:
        """
        Reject pending grant.

        Args:
            rejecter_id: User ID performing the rejection
            reason: Reason for rejection

        Raises:
            ValueError: If grant is not in PENDING status
        """
        if not self.status.can_be_rejected():
            raise ValueError(
                f"Cannot reject {self.status} grant; only pending grants can be rejected"
            )

        now = datetime.now(UTC)
        self.status = MarketplaceAccessStatus.REJECTED
        self.rejected_by_user_id = rejecter_id
        self.rejected_at = now
        self.rejection_reason = reason
        self.updated_at = now

    def revoke(self, revoker_id: UUID, reason: str) -> None:
        """
        Revoke active grant.

        Args:
            revoker_id: User ID performing the revocation
            reason: Reason for revocation

        Raises:
            ValueError: If grant is not in ACTIVE status
        """
        if not self.status.can_be_revoked():
            raise ValueError(
                f"Cannot revoke {self.status} grant; only active grants can be revoked"
            )

        now = datetime.now(UTC)
        self.status = MarketplaceAccessStatus.REVOKED
        self.revoked_by_user_id = revoker_id
        self.revoked_at = now
        self.revocation_reason = reason
        self.updated_at = now

    @property
    def is_active(self) -> bool:
        """Check if grant is currently active."""
        return self.status.is_active()

    @property
    def is_pending(self) -> bool:
        """Check if grant is pending approval."""
        return self.status.is_pending()
