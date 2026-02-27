"""Organization entity - Pure domain logic with no external dependencies."""

from datetime import UTC, datetime
from uuid import UUID

from pydantic import Field

from prosell.domain.base import DomainModel
from prosell.domain.value_objects.organization_status import OrganizationStatus


class Organization(DomainModel):
    """
    Organization entity.

    Pure domain logic - no external dependencies.
    All business rules for organizations live here.
    """

    # Required fields
    id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    tenant_id: UUID  # For multi-tenant isolation

    # Branding
    logo_url: str | None = None
    banner_url: str | None = None
    description: str | None = None
    website: str | None = None
    phone: str | None = None

    # Verification & settings
    status: OrganizationStatus = OrganizationStatus.PENDING_VERIFICATION
    verified_at: datetime | None = None
    verified_by: UUID | None = None  # User ID who verified

    # Wallet (lazy loaded)
    wallet_id: UUID | None = None

    # Metadata
    settings: dict = Field(default_factory=dict)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        name: str,
        tenant_id: UUID,
        _creator_id: UUID | None = None,  # Reserved for audit trail (unused)
    ) -> "Organization":
        """
        Factory method for new organization creation.

        Creates a new organization in PENDING_VERIFICATION status.
        The tenant_id is the same as the organization id (self-referential).

        Args:
            name: Organization name
            tenant_id: Unique tenant identifier (same as org id for multi-tenant)
            creator_id: User ID who created the org (for audit trail)

        Returns:
            New Organization entity
        """
        return cls(
            id=tenant_id,  # Self-referential: org_id == tenant_id
            name=name,
            tenant_id=tenant_id,
            status=OrganizationStatus.PENDING_VERIFICATION,
            verified_at=None,
            verified_by=None,
            wallet_id=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    def verify(self, verifier_id: UUID) -> None:
        """
        Verify organization - transitions to ACTIVE status.

        Args:
            verifier_id: User ID performing the verification

        Raises:
            ValueError: If organization is not in PENDING_VERIFICATION status
        """
        if self.status != OrganizationStatus.PENDING_VERIFICATION:
            raise ValueError(
                f"Only pending organizations can be verified. " f"Current status: {self.status}"
            )

        self.status = OrganizationStatus.ACTIVE
        self.verified_at = datetime.now(UTC)
        self.verified_by = verifier_id
        self.updated_at = datetime.now(UTC)

    def reject(self, verifier_id: UUID) -> None:
        """
        Reject organization verification.

        Args:
            verifier_id: User ID performing the rejection

        Raises:
            ValueError: If organization is not in PENDING_VERIFICATION status
        """
        if self.status != OrganizationStatus.PENDING_VERIFICATION:
            raise ValueError(
                f"Only pending organizations can be rejected. " f"Current status: {self.status}"
            )

        self.status = OrganizationStatus.REJECTED
        self.verified_by = verifier_id
        self.updated_at = datetime.now(UTC)

    def suspend(self) -> None:
        """
        Suspend organization.

        Suspended organizations cannot create listings or perform operations.
        This is reversible with activate().
        """
        if self.status == OrganizationStatus.SUSPENDED:
            return  # Already suspended

        self.status = OrganizationStatus.SUSPENDED
        self.updated_at = datetime.now(UTC)

    def activate(self) -> None:
        """
        Activate a suspended organization.

        Raises:
            ValueError: If organization is REJECTED (cannot activate)
        """
        if self.status == OrganizationStatus.REJECTED:
            raise ValueError(
                "Rejected organizations cannot be activated. " "Please create a new organization."
            )

        if self.status == OrganizationStatus.ACTIVE:
            return  # Already active

        self.status = OrganizationStatus.ACTIVE
        self.updated_at = datetime.now(UTC)

    def update_logo(self, logo_url: str) -> None:
        """
        Update organization logo.

        Args:
            logo_url: Public URL of the logo image
        """
        self.logo_url = logo_url
        self.updated_at = datetime.now(UTC)

    def update_banner(self, banner_url: str) -> None:
        """
        Update organization banner.

        Args:
            banner_url: Public URL of the banner image
        """
        self.banner_url = banner_url
        self.updated_at = datetime.now(UTC)

    def update_settings(self, settings: dict) -> None:
        """
        Update organization settings.

        Args:
            settings: Dictionary of settings (merged with existing)
        """
        self.settings = {**self.settings, **settings}
        self.updated_at = datetime.now(UTC)

    def update_basic_info(
        self,
        name: str | None = None,
        description: str | None = None,
        website: str | None = None,
        phone: str | None = None,
    ) -> None:
        """
        Update basic organization information.

        Args:
            name: New name (optional)
            description: New description (optional)
            website: New website (optional)
            phone: New phone (optional)
        """
        if name is not None:
            self.name = name
        if description is not None:
            self.description = description
        if website is not None:
            self.website = website
        if phone is not None:
            self.phone = phone

        self.updated_at = datetime.now(UTC)

    @property
    def can_create_listings(self) -> bool:
        """Check if organization can create vehicle listings."""
        return self.status == OrganizationStatus.ACTIVE

    @property
    def is_verified(self) -> bool:
        """Check if organization is verified."""
        return self.status == OrganizationStatus.ACTIVE

    @property
    def days_since_creation(self) -> int:
        """Calculate days since organization was created."""
        return (datetime.now(UTC) - self.created_at).days
