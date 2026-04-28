"""Lead entity - Pure domain logic with no external dependencies."""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import Field

from prosell.domain.base import DomainModel
from prosell.domain.exceptions import LeadStateTransitionException


class LeadStatus(StrEnum):
    """Lead lifecycle status.

    Represents the 5-state lead lifecycle:
    - NEW: Initial state when lead is captured
    - CONTACTED: Vendedor has contacted the buyer
    - QUALIFIED: Buyer has shown genuine interest
    - APPOINTMENT_SET: Appointment has been scheduled
    - LOST: Lead is no longer viable (terminal state)
    """

    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    APPOINTMENT_SET = "appointment_set"
    LOST = "lost"

    def is_lost(self) -> bool:
        """Check if lead is lost."""
        return self == LeadStatus.LOST

    def __str__(self) -> str:
        return self.value

    @classmethod
    def transitions(cls) -> dict["LeadStatus", list["LeadStatus"]]:
        """Define valid status transitions.

        Returns:
            Dict mapping current status to list of valid next statuses
        """
        return {
            cls.NEW: [cls.CONTACTED, cls.LOST],
            cls.CONTACTED: [cls.QUALIFIED, cls.LOST],
            cls.QUALIFIED: [cls.APPOINTMENT_SET, cls.LOST],
            cls.APPOINTMENT_SET: [cls.LOST],
            cls.LOST: [],  # Terminal state
        }

    def can_transition_to(self, new_status: "LeadStatus") -> bool:
        """Check if transition to new status is valid.

        Args:
            new_status: Target status

        Returns:
            True if transition is valid
        """
        valid_transitions = self.transitions().get(self, [])
        return new_status in valid_transitions


class Lead(DomainModel):
    """
    Lead entity.

    Pure domain logic - no external dependencies.
    All business rules for leads live here.
    """

    # Identity fields
    id: UUID
    tenant_id: UUID

    # Buyer information
    buyer_name: str
    buyer_email: str | None = None
    buyer_phone: str | None = None

    # Relationships
    vehicle_id: UUID | None = None
    vendedor_id: UUID | None = None

    # Lead details
    message: str | None = None
    source: str = "manual"  # facebook, web, manual, etc.

    # Status
    status: LeadStatus = LeadStatus.NEW

    # Audit fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        buyer_name: str,
        tenant_id: UUID,
        buyer_email: str | None = None,
        buyer_phone: str | None = None,
        vehicle_id: UUID | None = None,
        vendedor_id: UUID | None = None,
        message: str | None = None,
        source: str = "manual",
        **kwargs: Any,
    ) -> "Lead":
        """
        Factory method for new lead creation.

        Args:
            buyer_name: Buyer's name
            tenant_id: Unique tenant identifier
            buyer_email: Buyer's email (optional)
            buyer_phone: Buyer's phone (optional)
            vehicle_id: Associated vehicle ID (optional)
            vendedor_id: Assigned vendedor ID (optional)
            message: Buyer's message (optional)
            source: Lead source (default: "manual")
            **kwargs: Additional optional fields

        Returns:
            New Lead entity
        """
        return cls(
            id=uuid4(),
            buyer_name=buyer_name,
            tenant_id=tenant_id,
            buyer_email=buyer_email,
            buyer_phone=buyer_phone,
            vehicle_id=vehicle_id,
            vendedor_id=vendedor_id,
            message=message,
            source=source,
            status=LeadStatus.NEW,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            **kwargs,
        )

    def can_transition_to(self, new_status: LeadStatus) -> bool:
        """Check if transition to new status is valid.

        Args:
            new_status: Target status

        Returns:
            True if transition is valid
        """
        return self.status.can_transition_to(new_status)

    def transition_to(self, new_status: LeadStatus) -> None:
        """
        Transition lead to new status.

        Args:
            new_status: Target status

        Raises:
            LeadStateTransitionException: If transition is invalid
        """
        if not self.can_transition_to(new_status):
            raise LeadStateTransitionException(
                current_status=self.status.value,
                target_status=new_status.value,
            )

        self.status = new_status
        self.updated_at = datetime.now(UTC)

    def is_lost(self) -> bool:
        """Check if lead is lost."""
        return self.status.is_lost()
