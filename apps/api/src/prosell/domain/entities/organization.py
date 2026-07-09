"""Organization entity - Pure domain logic with no external dependencies."""

from datetime import UTC, datetime
from uuid import UUID

from prosell.domain.base import DomainModel, Field
from prosell.domain.exceptions.org_exceptions import OrganizationVerificationException
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

    # Contact info
    email: str | None = None
    whatsapp: str | None = None

    # Address
    street_address: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None

    # Legal / fiscal
    tax_id: str | None = None

    # Social media
    instagram: str | None = None
    facebook: str | None = None

    # Verification & settings
    status: OrganizationStatus = OrganizationStatus.PENDING_VERIFICATION
    verified_at: datetime | None = None
    verified_by: UUID | None = None  # User ID who verified

    # Wallet (lazy loaded)
    wallet_id: UUID | None = None

    # Onboarding
    setup_complete: bool = False
    created_by_user_id: UUID | None = None  # Staff who created this org (audit trail)

    # Metadata
    settings: dict[str, object] = Field(default_factory=dict)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        name: str,
        tenant_id: UUID,
        creator_id: UUID | None = None,
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
            created_by_user_id=creator_id,
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
            raise OrganizationVerificationException(
                f"only pending organizations can be verified; current: {self.status}"
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
                f"Only pending organizations can be rejected. Current status: {self.status}"
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
            raise OrganizationVerificationException(
                "rejected organizations cannot be activated; create a new organization"
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

    def update_settings(self, settings: dict[str, object]) -> None:
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
        email: str | None = None,
        whatsapp: str | None = None,
        street_address: str | None = None,
        city: str | None = None,
        state: str | None = None,
        postal_code: str | None = None,
        country: str | None = None,
        tax_id: str | None = None,
        instagram: str | None = None,
        facebook: str | None = None,
    ) -> None:
        """
        Update organization information.

        All args are optional — only non-None values are applied.
        """
        if name is not None:
            self.name = name
        if description is not None:
            self.description = description
        if website is not None:
            self.website = website
        if phone is not None:
            self.phone = phone
        if email is not None:
            self.email = email
        if whatsapp is not None:
            self.whatsapp = whatsapp
        if street_address is not None:
            self.street_address = street_address
        if city is not None:
            self.city = city
        if state is not None:
            self.state = state
        if postal_code is not None:
            self.postal_code = postal_code
        if country is not None:
            self.country = country
        if tax_id is not None:
            self.tax_id = tax_id
        if instagram is not None:
            self.instagram = instagram
        if facebook is not None:
            self.facebook = facebook

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
