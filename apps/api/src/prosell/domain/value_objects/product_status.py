"""Product status value object."""

from enum import StrEnum


class ProductStatus(StrEnum):
    """Product status enum.

    Represents the lifecycle state of a product:
    - DRAFT: Initial state, product being edited
    - PENDING: Submitted for approval, awaiting review
    - PUBLISHED: Approved and visible in marketplace
    - PAUSED: Temporarily hidden (reversible)
    - RESERVED: On hold for a buyer
    - SOLD: Product sold and transaction completed
    - REJECTED: Approval failed (can resubmit)
    - ARCHIVED: Soft deleted, not visible
    """

    DRAFT = "draft"
    PENDING = "pending"
    PUBLISHED = "published"
    PAUSED = "paused"
    RESERVED = "reserved"
    SOLD = "sold"
    REJECTED = "rejected"
    ARCHIVED = "archived"

    def is_published(self) -> bool:
        """Check if product is published."""
        return self == ProductStatus.PUBLISHED

    def is_visible(self) -> bool:
        """Check if product is visible in marketplace."""
        return self in (
            ProductStatus.PUBLISHED,
            ProductStatus.PAUSED,
            ProductStatus.RESERVED,
        )

    def can_edit(self) -> bool:
        """Check if product can be edited."""
        return self in (
            ProductStatus.DRAFT,
            ProductStatus.REJECTED,
            ProductStatus.PAUSED,
        )

    def can_submit_for_approval(self) -> bool:
        """Check if product can be submitted for approval."""
        return self in (ProductStatus.DRAFT, ProductStatus.REJECTED)

    def can_approve(self) -> bool:
        """Check if product can be approved."""
        return self == ProductStatus.PENDING

    def can_reject(self) -> bool:
        """Check if product can be rejected."""
        return self == ProductStatus.PENDING

    def can_publish(self) -> bool:
        """Check if product can be published."""
        return self == ProductStatus.PENDING

    def can_pause(self) -> bool:
        """Check if product can be paused."""
        return self == ProductStatus.PUBLISHED

    def can_mark_sold(self) -> bool:
        """Check if product can be marked as sold."""
        return self in (ProductStatus.PUBLISHED, ProductStatus.RESERVED)

    def can_archive(self) -> bool:
        """Check if product can be archived."""
        return self != ProductStatus.ARCHIVED

    def __str__(self) -> str:
        return self.value

    @classmethod
    def transitions(cls) -> dict["ProductStatus", list["ProductStatus"]]:
        """Define valid status transitions.

        Returns:
            Dict mapping current status to list of valid next statuses
        """
        return {
            cls.DRAFT: [cls.PENDING, cls.ARCHIVED],
            cls.PENDING: [cls.PUBLISHED, cls.REJECTED],
            cls.PUBLISHED: [cls.PAUSED, cls.RESERVED, cls.SOLD, cls.ARCHIVED],
            cls.PAUSED: [cls.PUBLISHED, cls.ARCHIVED],
            cls.RESERVED: [cls.PUBLISHED, cls.SOLD, cls.ARCHIVED],
            cls.SOLD: [cls.ARCHIVED],
            cls.REJECTED: [cls.DRAFT, cls.ARCHIVED],
            cls.ARCHIVED: [],  # Terminal state
        }

    def can_transition_to(self, new_status: "ProductStatus") -> bool:
        """Check if transition to new status is valid.

        Args:
            new_status: Target status

        Returns:
            True if transition is valid
        """
        valid_transitions = self.transitions().get(self, [])
        return new_status in valid_transitions
