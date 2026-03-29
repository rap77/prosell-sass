"""Unit tests for Dealer domain entity."""

from datetime import datetime
from uuid import UUID, uuid4

import pytest

from prosell.domain.entities.dealer import Dealer
from prosell.domain.exceptions.dealer_exceptions import DealerNotFoundError, SlugNotUniqueError


class TestDealerEntity:
    """Test Dealer entity creation and validation."""

    def test_dealer_create_factory_generates_valid_entity(self):
        """Test Dealer.create() generates valid entity with UUID, timestamp, slug from name."""
        # Arrange
        name = "Toyota Centro"
        tenant_id = uuid4()

        # Act
        dealer = Dealer.create(name=name, tenant_id=tenant_id)

        # Assert
        assert isinstance(dealer.id, UUID)
        assert dealer.name == name
        assert dealer.tenant_id == tenant_id
        assert dealer.slug == "toyota-centro"  # Auto-generated from name
        assert isinstance(dealer.created_at, datetime)
        assert isinstance(dealer.updated_at, datetime)
        assert dealer.timezone == "America/Montevideo"  # Default
        assert dealer.settings == {}  # Default

    def test_dealer_create_factory_with_custom_slug(self):
        """Test Dealer.create() with custom slug parameter."""
        # Arrange
        name = "Toyota Centro"
        tenant_id = uuid4()
        custom_slug = "custom-slug"

        # Act
        dealer = Dealer.create(name=name, tenant_id=tenant_id, slug=custom_slug)

        # Assert
        assert dealer.slug == custom_slug

    def test_dealer_timezone_defaults_to_montevideo(self):
        """Test Timezone defaults to "America/Montevideo"."""
        # Arrange & Act
        dealer = Dealer.create(name="Test Dealer", tenant_id=uuid4())

        # Assert
        assert dealer.timezone == "America/Montevideo"

    def test_dealer_location_coordinates_accept_none_or_valid_floats(self):
        """Test Location coordinates (lat/lng) accept None or valid float values."""
        # Arrange & Act
        dealer = Dealer.create(
            name="Test Dealer",
            tenant_id=uuid4(),
            location_lat=-34.9011,
            location_lng=-56.1645,
        )

        # Assert
        assert dealer.location_lat == -34.9011
        assert dealer.location_lng == -56.1645

    def test_dealer_location_coordinates_accept_none(self):
        """Test Location coordinates accept None."""
        # Arrange & Act
        dealer = Dealer.create(name="Test Dealer", tenant_id=uuid4())

        # Assert
        assert dealer.location_lat is None
        assert dealer.location_lng is None

    def test_dealer_settings_accepts_dict(self):
        """Test Settings field accepts dict for flexible configuration."""
        # Arrange
        settings = {"feature_x": True, "limit_y": 100}

        # Act
        dealer = Dealer.create(name="Test Dealer", tenant_id=uuid4(), settings=settings)

        # Assert
        assert dealer.settings == settings

    def test_dealer_slug_generation_from_name(self):
        """Test slug generation: lowercase, replace spaces with hyphens, remove special chars."""
        # Arrange & Act
        dealer = Dealer.create(name="Ford Motors Uruguay!", tenant_id=uuid4())

        # Assert
        assert dealer.slug == "ford-motors-uruguay"  # No special chars, lowercase

    def test_dealer_update_basic_info(self):
        """Test updating dealer basic information."""
        # Arrange
        dealer = Dealer.create(name="Original Name", tenant_id=uuid4())

        # Act
        dealer.update_basic_info(
            name="Updated Name",
            location_address="123 Main St",
            location_city="Montevideo",
        )

        # Assert
        assert dealer.name == "Updated Name"
        assert dealer.location_address == "123 Main St"
        assert dealer.location_city == "Montevideo"
        assert dealer.updated_at > dealer.created_at  # Timestamp updated

    def test_dealer_update_settings(self):
        """Test updating dealer settings."""
        # Arrange
        dealer = Dealer.create(name="Test Dealer", tenant_id=uuid4())

        # Act
        dealer.update_settings({"new_feature": True})

        # Assert
        assert dealer.settings == {"new_feature": True}
        assert dealer.updated_at > dealer.created_at

    def test_dealer_update_settings_merges(self):
        """Test update_settings merges with existing settings."""
        # Arrange
        dealer = Dealer.create(name="Test Dealer", tenant_id=uuid4(), settings={"feature_a": True})

        # Act
        dealer.update_settings({"feature_b": False})

        # Assert
        assert dealer.settings == {"feature_a": True, "feature_b": False}


class TestDealerExceptions:
    """Test Dealer domain exceptions."""

    def test_dealer_not_found_exception(self):
        """Test DealerNotFoundError exception can be raised."""
        # Arrange & Act & Assert
        with pytest.raises(DealerNotFoundError, match="Dealer not found"):
            raise DealerNotFoundError(dealer_id=uuid4())

    def test_slug_not_unique_exception(self):
        """Test SlugNotUniqueError exception can be raised."""
        # Arrange & Act & Assert
        with pytest.raises(SlugNotUniqueError, match="Slug already exists"):
            raise SlugNotUniqueError(slug="existing-slug", tenant_id=uuid4())


class TestDealerRepositoryInterface:
    """Test AbstractDealerRepository interface exists."""

    def test_dealer_repository_interface_exists(self):
        """Test Interface defines abstract methods for CRUD operations."""
        from prosell.domain.repositories.dealer_repository import (
            AbstractDealerRepository,
        )

        # Assert - Interface should have abstract methods
        abstract_methods = [
            "create",
            "get_by_id",
            "get_by_slug",
            "update",
            "delete",
            "exists_by_slug",
            "list_by_tenant",
        ]

        for method_name in abstract_methods:
            assert hasattr(AbstractDealerRepository, method_name)
