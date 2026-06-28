"""Unit tests for Category entity."""

from typing import Any
from uuid import uuid4

import pytest

from prosell.domain.entities.category import Category


class TestCategory:
    """Test Category entity."""

    def test_create_root_category(self) -> None:
        """Test creating a root category."""
        tenant_id = uuid4()
        category = Category.create(
            name="Vehicles",
            slug="vehicles",
            tenant_id=tenant_id,
            parent_id=None,
            level=0,
        )

        assert category.id is not None
        assert category.name == "Vehicles"
        assert category.slug == "vehicles"
        assert category.tenant_id == tenant_id
        assert category.parent_id is None
        assert category.level == 0
        assert category.is_active is True
        assert category.field_config == []

    def test_create_child_category(self) -> None:
        """Test creating a child category."""
        tenant_id = uuid4()
        parent_id = uuid4()

        category = Category.create(
            name="Cars",
            slug="cars",
            tenant_id=tenant_id,
            parent_id=parent_id,
            level=1,
        )

        assert category.parent_id == parent_id
        assert category.level == 1

    def test_slug_validation(self) -> None:
        """Test slug validation."""
        tenant_id = uuid4()

        # Valid slug
        category = Category.create(
            name="Test Category",
            slug="test-category",
            tenant_id=tenant_id,
        )
        assert category.slug == "test-category"

        # Invalid slug with spaces
        with pytest.raises(ValueError, match="slug must contain only"):
            Category.create(
                name="Test",
                slug="test category",
                tenant_id=tenant_id,
            )

    def test_add_field(self) -> None:
        """Test adding a dynamic field."""
        tenant_id = uuid4()
        category = Category.create(
            name="Vehicles",
            slug="vehicles",
            tenant_id=tenant_id,
        )

        field_config = {
            "field_name": "year",
            "field_label": "Año",
            "field_type": "NUMBER",
            "is_required": True,
        }

        category.add_field(field_config)

        assert len(category.field_config) == 1
        assert category.field_config[0]["field_name"] == "year"

    def test_add_duplicate_field_raises_error(self) -> None:
        """Test that adding duplicate field raises error."""
        tenant_id = uuid4()
        category = Category.create(
            name="Vehicles",
            slug="vehicles",
            tenant_id=tenant_id,
        )

        field_config = {
            "field_name": "year",
            "field_label": "Año",
            "field_type": "NUMBER",
            "is_required": True,
        }

        category.add_field(field_config)

        with pytest.raises(ValueError, match="already exists"):
            category.add_field(field_config)

    def test_remove_field(self) -> None:
        """Test removing a field."""
        tenant_id = uuid4()
        category = Category.create(
            name="Vehicles",
            slug="vehicles",
            tenant_id=tenant_id,
        )

        field_config = {
            "field_name": "year",
            "field_label": "Año",
            "field_type": "NUMBER",
            "is_required": True,
        }

        category.add_field(field_config)
        assert len(category.field_config) == 1

        category.remove_field("year")
        assert len(category.field_config) == 0

    def test_update_field(self) -> None:
        """Test updating a field."""
        tenant_id = uuid4()
        category = Category.create(
            name="Vehicles",
            slug="vehicles",
            tenant_id=tenant_id,
        )

        field_config = {
            "field_name": "year",
            "field_label": "Año",
            "field_type": "NUMBER",
            "is_required": True,
        }

        category.add_field(field_config)

        category.update_field("year", {"field_label": "Model Year"})

        field = category.get_field_config("year")
        assert field is not None
        assert field["field_label"] == "Model Year"

    def test_activate_deactivate(self) -> None:
        """Test activating and deactivating category."""
        tenant_id = uuid4()
        category = Category.create(
            name="Vehicles",
            slug="vehicles",
            tenant_id=tenant_id,
        )

        assert category.is_active is True

        category.deactivate()
        assert category.is_active is False

        category.activate()
        assert category.is_active is True

    def test_set_sort_order(self) -> None:
        """Test setting sort order."""
        tenant_id = uuid4()
        category = Category.create(
            name="Vehicles",
            slug="vehicles",
            tenant_id=tenant_id,
        )

        category.set_sort_order(5)
        assert category.sort_order == 5

    def test_set_sort_order_negative_raises_error(self) -> None:
        """Test that negative sort order raises error."""
        tenant_id = uuid4()
        category = Category.create(
            name="Vehicles",
            slug="vehicles",
            tenant_id=tenant_id,
        )

        with pytest.raises(ValueError, match="sort_order must be >= 0"):
            category.set_sort_order(-1)

    def test_is_root_property(self) -> None:
        """Test is_root property."""
        tenant_id = uuid4()

        root_category = Category.create(
            name="Vehicles",
            slug="vehicles",
            tenant_id=tenant_id,
            parent_id=None,
        )
        assert root_category.is_root is True

        parent_id = uuid4()
        child_category = Category.create(
            name="Cars",
            slug="cars",
            tenant_id=tenant_id,
            parent_id=parent_id,
        )
        assert child_category.is_root is False


class TestCategoryAttributeGroups:
    """Tests for attribute_groups field on Category entity."""

    def _make(self, **kwargs: Any) -> Category:  # Any: forwards arbitrary kwargs to Category.create
        return Category.create(
            name="Cars",
            slug="cars",
            tenant_id=uuid4(),
            **kwargs,
        )

    def test_default_attribute_groups_is_empty(self) -> None:
        cat = self._make()
        assert cat.attribute_groups == []

    def test_attribute_groups_stored_and_retrieved(self) -> None:
        groups = [
            {"key": "basic", "label": "Basic Info", "order": 0},
            {"key": "motor", "label": "Motor", "order": 1},
        ]
        cat = self._make(attribute_groups=groups)
        assert cat.attribute_groups == groups

    def test_attribute_groups_independent_per_instance(self) -> None:
        cat1 = self._make()
        cat2 = self._make()
        cat1.attribute_groups.append({"key": "x", "label": "X", "order": 0})
        assert cat2.attribute_groups == []
