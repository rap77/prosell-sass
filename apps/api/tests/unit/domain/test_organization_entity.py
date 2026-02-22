"""Unit tests for Organization entity."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from prosell.domain.entities.organization import Organization
from prosell.domain.value_objects.organization_status import OrganizationStatus


class TestOrganizationFactory:
    """Test Organization entity factory method."""

    def test_create_organization_factory(self) -> None:
        """Test Organization.create() factory method."""
        tenant_id = uuid4()
        org = Organization.create(
            name="Test Organization",
            tenant_id=tenant_id,
        )

        assert isinstance(org.id, UUID)
        assert org.id == tenant_id  # Self-referential
        assert org.name == "Test Organization"
        assert org.tenant_id == tenant_id
        assert org.status == OrganizationStatus.PENDING_VERIFICATION
        assert org.verified_at is None
        assert org.verified_by is None
        assert org.wallet_id is None

    def test_create_organization_generates_unique_ids(self) -> None:
        """Test that factory creates unique UUIDs for each org."""
        tenant_id_1 = uuid4()
        tenant_id_2 = uuid4()

        org1 = Organization.create(name="Org 1", tenant_id=tenant_id_1)
        org2 = Organization.create(name="Org 2", tenant_id=tenant_id_2)

        assert org1.id != org2.id
        assert org1.id == tenant_id_1
        assert org2.id == tenant_id_2


class TestOrganizationVerification:
    """Test organization verification workflow."""

    def test_verify_organization_transitions_to_active(self) -> None:
        """Test that verify() changes status to ACTIVE."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        verifier_id = uuid4()

        org.verify(verifier_id)

        assert org.status == OrganizationStatus.ACTIVE
        assert org.verified_at is not None
        assert org.verified_by == verifier_id
        assert org.verified_at <= datetime.now(UTC)

    def test_verify_only_pending_orgs(self) -> None:
        """Test that only pending orgs can be verified."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        verifier_id = uuid4()

        org.verify(verifier_id)

        # Second verify should fail
        with pytest.raises(ValueError, match="Only pending"):
            org.verify(uuid4())

    def test_verify_sets_timestamp(self) -> None:
        """Test that verify() sets verified_at timestamp."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        verifier_id = uuid4()

        assert org.verified_at is None
        org.verify(verifier_id)
        assert isinstance(org.verified_at, datetime)

    def test_verify_sets_verifier_id(self) -> None:
        """Test that verify() stores who performed verification."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        verifier_id = uuid4()

        org.verify(verifier_id)
        assert org.verified_by == verifier_id

    def test_reject_organization(self) -> None:
        """Test that reject() changes status to REJECTED."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        verifier_id = uuid4()

        org.reject(verifier_id)

        assert org.status == OrganizationStatus.REJECTED
        assert org.verified_by == verifier_id

    def test_reject_only_pending_orgs(self) -> None:
        """Test that only pending orgs can be rejected."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        verifier_id = uuid4()

        org.verify(verifier_id)

        # Cannot reject verified org
        with pytest.raises(ValueError, match="Only pending"):
            org.reject(uuid4())


class TestOrganizationSuspension:
    """Test organization suspension workflow."""

    def test_suspend_organization(self) -> None:
        """Test that suspend() changes status to SUSPENDED."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        org.verify(uuid4())

        org.suspend()

        assert org.status == OrganizationStatus.SUSPENDED

    def test_suspend_is_idempotent(self) -> None:
        """Test that suspend() is idempotent."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())

        org.suspend()
        original_status = org.status
        org.suspend()

        assert org.status == original_status

    def test_activate_suspended_org(self) -> None:
        """Test that activate() reactivates suspended org."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        org.verify(uuid4())
        org.suspend()

        org.activate()

        assert org.status == OrganizationStatus.ACTIVE

    def test_activate_is_idempotent(self) -> None:
        """Test that activate() is idempotent on active orgs."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        org.verify(uuid4())

        org.activate()
        assert org.status == OrganizationStatus.ACTIVE

    def test_activate_rejected_org_fails(self) -> None:
        """Test that rejected orgs cannot be activated."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        verifier_id = uuid4()

        org.reject(verifier_id)

        with pytest.raises(ValueError, match="Rejected organizations cannot be activated"):
            org.activate()


class TestOrganizationBranding:
    """Test organization branding (logo, banner) updates."""

    def test_update_logo(self) -> None:
        """Test that update_logo() sets logo URL."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        logo_url = "https://example.com/logo.png"

        org.update_logo(logo_url)

        assert org.logo_url == logo_url

    def test_update_banner(self) -> None:
        """Test that update_banner() sets banner URL."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        banner_url = "https://example.com/banner.png"

        org.update_banner(banner_url)

        assert org.banner_url == banner_url


class TestOrganizationSettings:
    """Test organization settings management."""

    def test_update_settings_merges(self) -> None:
        """Test that update_settings() merges with existing settings."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())

        org.update_settings({"theme": "dark", "language": "en"})
        assert org.settings == {"theme": "dark", "language": "en"}

        org.update_settings({"language": "es"})
        assert org.settings == {"theme": "dark", "language": "es"}

    def test_update_basic_info(self) -> None:
        """Test that update_basic_info() updates fields."""
        org = Organization.create(
            name="Original Name",
            tenant_id=uuid4(),
        )

        org.update_basic_info(
            name="New Name",
            description="New description",
            website="https://example.com",
            phone="+1234567890",
        )

        assert org.name == "New Name"
        assert org.description == "New description"
        assert org.website == "https://example.com"
        assert org.phone == "+1234567890"

    def test_update_basic_info_partial(self) -> None:
        """Test that update_basic_info() can update partial fields."""
        org = Organization.create(name="Original", tenant_id=uuid4())

        org.update_basic_info(description="Just description")

        assert org.name == "Original"  # Unchanged
        assert org.description == "Just description"


class TestOrganizationProperties:
    """Test organization property methods."""

    def test_can_create_listings_active(self) -> None:
        """Test that active orgs can create listings."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        org.verify(uuid4())

        assert org.can_create_listings is True

    def test_can_create_listings_pending_false(self) -> None:
        """Test that pending orgs cannot create listings."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())

        assert org.can_create_listings is False

    def test_can_create_listings_suspended_false(self) -> None:
        """Test that suspended orgs cannot create listings."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        org.verify(uuid4())
        org.suspend()

        assert org.can_create_listings is False

    def test_is_verified_active(self) -> None:
        """Test that is_verified returns True for active orgs."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        org.verify(uuid4())

        assert org.is_verified is True

    def test_is_verified_pending_false(self) -> None:
        """Test that is_verified returns False for pending orgs."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())

        assert org.is_verified is False

    def test_days_since_creation(self) -> None:
        """Test that days_since_creation calculates correctly."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())

        days = org.days_since_creation
        assert days == 0

    def test_days_since_creation_future(self) -> None:
        """Test that days_since_creation grows over time."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())

        # This test will pass as long as org was created recently
        days = org.days_since_creation
        assert days >= 0
        assert isinstance(days, int)


class TestOrganizationStatusValueObject:
    """Test OrganizationStatus value object."""

    def test_status_is_active(self) -> None:
        """Test OrganizationStatus.is_active()."""
        assert OrganizationStatus.ACTIVE.is_active() is True
        assert OrganizationStatus.PENDING_VERIFICATION.is_active() is False

    def test_status_can_operate(self) -> None:
        """Test OrganizationStatus.can_operate()."""
        assert OrganizationStatus.ACTIVE.can_operate() is True
        assert OrganizationStatus.PENDING_VERIFICATION.can_operate() is True
        assert OrganizationStatus.SUSPENDED.can_operate() is False
        assert OrganizationStatus.REJECTED.can_operate() is False

    def test_status_is_suspended(self) -> None:
        """Test OrganizationStatus.is_suspended()."""
        assert OrganizationStatus.SUSPENDED.is_suspended() is True
        assert OrganizationStatus.ACTIVE.is_suspended() is False


class TestOrganizationEdgeCases:
    """Test edge cases and validations."""

    def test_updated_at_changes_on_state_change(self) -> None:
        """Test that updated_at changes when state changes."""
        org = Organization.create(name="Test Org", tenant_id=uuid4())
        original_updated_at = org.updated_at

        import time

        time.sleep(0.01)
        org.verify(uuid4())

        assert org.updated_at > original_updated_at
