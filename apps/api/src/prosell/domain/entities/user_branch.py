"""UserBranch entity - M:N relationship between users and branches."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from pydantic import Field

from prosell.domain.base import DomainModel


class UserBranch(DomainModel):
    """
    UserBranch entity (M:N relationship).

    Represents the assignment of a user (seller/manager) to a branch organization.
    This is a read-only value object - assignments create new records, updates are not allowed.

    Audit trail tracks who made the assignment and when.
    """

    # Identity fields
    id: UUID
    user_id: UUID
    branch_id: UUID
    tenant_id: UUID  # For multi-tenant isolation

    # Audit fields
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    assigned_by: UUID | None = None  # User who made the assignment (None for system assignments)

    @classmethod
    def assign(
        cls,
        user_id: UUID,
        branch_id: UUID,
        tenant_id: UUID,
        assigned_by: UUID | None = None,
    ) -> "UserBranch":
        """
        Factory method for creating a new user-branch assignment.

        Args:
            user_id: User UUID being assigned
            branch_id: Branch UUID being assigned to
            tenant_id: Tenant UUID for isolation
            assigned_by: Optional UUID of user who made the assignment

        Returns:
            New UserBranch entity
        """
        return cls(
            id=uuid4(),
            user_id=user_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            assigned_at=datetime.now(UTC),
            assigned_by=assigned_by,
        )
