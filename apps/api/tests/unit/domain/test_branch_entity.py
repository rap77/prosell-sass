"""Unit tests for Branch domain entity."""

from datetime import datetime
from uuid import UUID, uuid4

import pytest

from prosell.domain.entities.branch import Branch
from prosell.domain.exceptions.branch_exceptions import BranchNotFoundError, SlugNotUniqueError


class TestBranchEntity:
    """Test Branch entity creation and validation."""

    def test_branch_create_factory_generates_valid_entity(self):
        """Test Branch.create() generates valid entity with UUID, timestamp, slug from name."""
        # Arrange
        name = "Toyota Centro"
        tenant_id = uuid4()

        # Act
        branch = Branch.create(name=name, tenant_id=tenant_id)

        # Assert
        assert isinstance(branch.id, UUID)
        assert branch.name == name
        assert branch.tenant_id == tenant_id
        assert branch.slug == "toyota-centro"  # Auto-generated from name
        assert isinstance(branch.created_at, datetime)
        assert isinstance(branch.updated_at, datetime)
        assert branch.timezone == "America/Montevideo"  # Default
        assert branch.settings == {}  # Default

    def test_branch_create_factory_with_custom_slug(self):
        """Test Branch.create() with custom slug parameter."""
        # Arrange
        name = "Toyota Centro"
        tenant_id = uuid4()
        custom_slug = "custom-slug"

        # Act
        branch = Branch.create(name=name, tenant_id=tenant_id, slug=custom_slug)

        # Assert
        assert branch.slug == custom_slug

    def test_branch_timezone_defaults_to_montevideo(self):
        """Test Timezone defaults to "America/Montevideo"."""
        # Arrange & Act
        branch = Branch.create(name="Test Branch", tenant_id=uuid4())

        # Assert
        assert branch.timezone == "America/Montevideo"

    def test_branch_location_coordinates_accept_none_or_valid_floats(self):
        """Test Location coordinates (lat/lng) accept None or valid float values."""
        # Arrange & Act
        branch = Branch.create(
            name="Test Branch",
            tenant_id=uuid4(),
            location_lat=-34.9011,
            location_lng=-56.1645,
        )

        # Assert
        assert branch.location_lat == -34.9011
        assert branch.location_lng == -56.1645

    def test_branch_location_coordinates_accept_none(self):
        """Test Location coordinates accept None."""
        # Arrange & Act
        branch = Branch.create(name="Test Branch", tenant_id=uuid4())

        # Assert
        assert branch.location_lat is None
        assert branch.location_lng is None

    def test_branch_settings_accepts_dict(self):
        """Test Settings field accepts dict for flexible configuration."""
        # Arrange
        settings = {"feature_x": True, "limit_y": 100}

        # Act
        branch = Branch.create(name="Test Branch", tenant_id=uuid4(), settings=settings)

        # Assert
        assert branch.settings == settings

    def test_branch_slug_generation_from_name(self):
        """Test slug generation: lowercase, replace spaces with hyphens, remove special chars."""
        # Arrange & Act
        branch = Branch.create(name="Ford Motors Uruguay!", tenant_id=uuid4())

        # Assert
        assert branch.slug == "ford-motors-uruguay"  # No special chars, lowercase

    def test_branch_update_basic_info(self):
        """Test updating branch basic information."""
        # Arrange
        branch = Branch.create(name="Original Name", tenant_id=uuid4())

        # Act
        branch.update_basic_info(
            name="Updated Name",
            location_address="123 Main St",
            location_city="Montevideo",
        )

        # Assert
        assert branch.name == "Updated Name"
        assert branch.location_address == "123 Main St"
        assert branch.location_city == "Montevideo"
        assert branch.updated_at > branch.created_at  # Timestamp updated

    def test_branch_update_settings(self):
        """Test updating branch settings."""
        # Arrange
        branch = Branch.create(name="Test Branch", tenant_id=uuid4())

        # Act
        branch.update_settings({"new_feature": True})

        # Assert
        assert branch.settings == {"new_feature": True}
        assert branch.updated_at > branch.created_at

    def test_branch_update_settings_merges(self):
        """Test update_settings merges with existing settings."""
        # Arrange
        branch = Branch.create(name="Test Branch", tenant_id=uuid4(), settings={"feature_a": True})

        # Act
        branch.update_settings({"feature_b": False})

        # Assert
        assert branch.settings == {"feature_a": True, "feature_b": False}


class TestBranchExceptions:
    """Test Branch domain exceptions."""

    def test_branch_not_found_exception(self):
        """Test BranchNotFoundError exception can be raised."""
        # Arrange & Act & Assert
        with pytest.raises(BranchNotFoundError, match="Branch not found"):
            raise BranchNotFoundError(branch_id=uuid4())

    def test_slug_not_unique_exception(self):
        """Test SlugNotUniqueError exception can be raised."""
        # Arrange & Act & Assert
        with pytest.raises(SlugNotUniqueError, match="Slug already exists"):
            raise SlugNotUniqueError(slug="existing-slug", tenant_id=uuid4())


class TestBranchRepositoryInterface:
    """Test AbstractBranchRepository interface exists."""

    def test_branch_repository_interface_exists(self):
        """Test Interface defines abstract methods for CRUD operations."""
        from prosell.domain.repositories.branch_repository import (
            AbstractBranchRepository,
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
            assert hasattr(AbstractBranchRepository, method_name)
