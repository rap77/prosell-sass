"""Team and TeamMember entities - Multi-level marketing hierarchy."""

from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import Field

from prosell.domain.base import DomainModel


class TeamMemberRole(StrEnum):
    """Team member role enum."""

    MANAGER = "manager"
    VENDOR = "vendor"

    def is_manager(self) -> bool:
        """Check if role is manager."""
        return self == TeamMemberRole.MANAGER

    def is_vendor(self) -> bool:
        """Check if role is vendor."""
        return self == TeamMemberRole.VENDOR

    def __str__(self) -> str:
        return self.value


class Team(DomainModel):
    """
    Team entity.

    Represents a sales team within an organization.
    Teams can have managers and vendors in a hierarchical structure.
    """

    # Required fields
    id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    tenant_id: UUID  # For multi-tenant isolation
    org_id: UUID  # Organization this team belongs to

    # Optional fields
    description: str | None = None
    parent_team_id: UUID | None = None  # For hierarchical teams

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Lazy loaded relationships
    members: list["TeamMember"] | None = None

    @classmethod
    def create(
        cls,
        name: str,
        tenant_id: UUID,
        org_id: UUID,
        parent_team_id: UUID | None = None,
    ) -> "Team":
        """
        Factory method for new team creation.

        Args:
            name: Team name
            tenant_id: Tenant UUID for isolation
            org_id: Organization UUID this team belongs to
            parent_team_id: Optional parent team for hierarchy

        Returns:
            New Team entity
        """
        return cls(
            id=uuid4(),
            name=name,
            tenant_id=tenant_id,
            org_id=org_id,
            parent_team_id=parent_team_id,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    def add_member(
        self,
        user_id: UUID,
        role: TeamMemberRole,
        commission_rate: float | None = None,
    ) -> "TeamMember":
        """
        Add a member to the team.

        Args:
            user_id: User UUID
            role: Member role (MANAGER or VENDOR)
            commission_rate: Commission rate for vendors (0-100)

        Returns:
            New TeamMember entity

        Raises:
            ValueError: If commission_rate is invalid
        """
        if commission_rate is not None and not (0 <= commission_rate <= 100):
            raise ValueError("Commission rate must be between 0 and 100")

        member = TeamMember(
            id=uuid4(),
            team_id=self.id,
            user_id=user_id,
            role=role,
            commission_rate=commission_rate,
            tenant_id=self.tenant_id,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        self.updated_at = datetime.now(UTC)
        return member

    def update_name(self, name: str) -> None:
        """Update team name."""
        self.name = name
        self.updated_at = datetime.now(UTC)

    def update_description(self, description: str) -> None:
        """Update team description."""
        self.description = description
        self.updated_at = datetime.now(UTC)

    @property
    def manager_count(self) -> int:
        """Count managers in the team."""
        if not self.members:
            return 0
        return sum(1 for m in self.members if m.role == TeamMemberRole.MANAGER)

    @property
    def vendor_count(self) -> int:
        """Count vendors in the team."""
        if not self.members:
            return 0
        return sum(1 for m in self.members if m.role == TeamMemberRole.VENDOR)


class TeamMember(DomainModel):
    """
    TeamMember entity.

    Represents a user's membership in a team with a specific role.
    """

    # Required fields
    id: UUID
    team_id: UUID
    user_id: UUID
    role: TeamMemberRole = Field(default=TeamMemberRole.VENDOR)
    tenant_id: UUID  # For multi-tenant isolation

    # Commission settings (for vendors)
    commission_rate: float | None = Field(default=None, ge=0, le=100)

    # Timestamps
    joined_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        team_id: UUID,
        user_id: UUID,
        role: TeamMemberRole,
        tenant_id: UUID,
        commission_rate: float | None = None,
    ) -> "TeamMember":
        """
        Factory method for new team member.

        Args:
            team_id: Team UUID
            user_id: User UUID
            role: Member role
            tenant_id: Tenant UUID
            commission_rate: Commission rate (0-100)

        Returns:
            New TeamMember entity
        """
        return cls(
            id=uuid4(),
            team_id=team_id,
            user_id=user_id,
            role=role,
            tenant_id=tenant_id,
            commission_rate=commission_rate,
            joined_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    def set_commission_rate(self, rate: float) -> None:
        """
        Set commission rate for this member.

        Args:
            rate: Commission rate (0-100)

        Raises:
            ValueError: If rate is invalid
        """
        if not (0 <= rate <= 100):
            raise ValueError("Commission rate must be between 0 and 100")

        self.commission_rate = rate
        self.updated_at = datetime.now(UTC)

    def promote_to_manager(self) -> None:
        """Promote vendor to manager role."""
        self.role = TeamMemberRole.MANAGER
        self.updated_at = datetime.now(UTC)

    def demote_to_vendor(self) -> None:
        """Demote manager to vendor role."""
        self.role = TeamMemberRole.VENDOR
        self.updated_at = datetime.now(UTC)

    @property
    def is_manager(self) -> bool:
        """Check if member is a manager."""
        return self.role.is_manager()

    @property
    def is_vendor(self) -> bool:
        """Check if member is a vendor."""
        return self.role.is_vendor()

    @property
    def earns_commission(self) -> bool:
        """
        Check if member earns commission (managers earn from vendors).

        Returns:
            True if manager, False otherwise
        """
        return self.is_manager

    @property
    def days_since_joined(self) -> int:
        """Calculate days since member joined the team."""
        return (datetime.now(UTC) - self.joined_at).days
