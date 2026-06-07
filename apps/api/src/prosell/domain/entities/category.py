"""Category entity - Pure domain logic for category hierarchy."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import Field, field_validator

from prosell.domain.base import DomainModel


class Category(DomainModel):
    """
    Category entity with hierarchical structure.

    Pure domain logic - no external dependencies.
    Supports multi-level categories (e.g., Vehicles → Cars → SUV).
    """

    # Required fields
    id: UUID
    # Tenant isolation. NULL marks a global template (root vertical, e.g.
    # "Vehicles") shared across all organizations (Plan 2). Tenant-scoped
    # categories still carry their tenant_id; only level-0 templates are
    # allowed to be global.
    tenant_id: UUID | None = None
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)

    # Hierarchy
    parent_id: UUID | None = None
    level: int = Field(default=0, ge=0)  # 0 = root category

    # Display
    icon: str | None = None  # Icon name/emoji
    description: str | None = None
    image_url: str | None = None

    # Organization
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True

    # Metadata (for dynamic fields config)
    # Format: {"fields": [{"field_name": "year", "field_type": "NUMBER", ...}]}
    field_config: list[dict[str, Any]] = Field(default_factory=lambda: [])

    # C3 schema: API validation schema for product attributes in this category
    # Format: {"field_name": {"type": "string|number|boolean", "required": bool, "options": [...]}}
    # Different from field_config (UI renderer) — this drives data validation
    attribute_schema: dict[str, Any] = Field(default_factory=dict)

    # Presentation contract — how products in this category are displayed.
    # Inherited down the tree (a child without its own falls back to the
    # nearest ancestor; inheritance is resolved by the read layer, Plan 2).
    # Shape: {"title_template": "{year} {make} {model}",
    #         "subtitle_template": "{trim}", "card_fields": ["price"]}
    presentation: dict[str, Any] | None = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, slug: str) -> str:
        """Validate slug format (lowercase, hyphens only)."""
        if not slug:
            raise ValueError("slug cannot be empty")
        # Slug should be lowercase with hyphens only
        if not slug.replace("-", "").replace("_", "").isalnum():
            raise ValueError("slug must contain only letters, numbers, hyphens and underscores")
        return slug.lower().replace("_", "-")

    @classmethod
    def create(
        cls,
        name: str,
        slug: str,
        tenant_id: UUID | None,
        parent_id: UUID | None = None,
        level: int = 0,
        **kwargs: Any,
    ) -> "Category":
        """
        Factory method for new category creation.

        Args:
            name: Category name
            slug: URL-friendly slug
            tenant_id: Unique tenant identifier, or None for a global
                template (Plan 2: root verticals shared across orgs).
            parent_id: Parent category ID (for hierarchy)
            level: Nesting level (0 = root)
            **kwargs: Additional optional fields

        Returns:
            New Category entity
        """
        return cls(
            id=uuid4(),
            name=name,
            slug=slug,
            tenant_id=tenant_id,
            parent_id=parent_id,
            level=level,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            **kwargs,
        )

    def validate_no_circular_reference(
        self, parent_id: UUID, ancestor_ids: list[UUID] | None = None
    ) -> None:
        """
        Prevent circular references in category hierarchy.

        A category cannot be its own parent, nor can it be a parent
        of any of its ancestors.

        Args:
            parent_id: ID of potential parent category
            ancestor_ids: List of ancestor category IDs (fetched from repository)

        Raises:
            ValueError: If circular reference detected
        """
        if parent_id == self.id:
            raise ValueError("Category cannot be its own parent")

        # Check if parent_id is in our ancestors (would create a cycle)
        if ancestor_ids and parent_id in ancestor_ids:
            raise ValueError(f"Circular reference: {parent_id} is an ancestor of this category")

    def add_field(self, field_config: dict[str, object]) -> None:
        """
        Add a dynamic field configuration to this category.

        Args:
            field_config: Field configuration dict with keys:
                field_name, field_label, field_type, is_required, etc.
        """
        # Validate required keys
        required_keys = {"field_name", "field_label", "field_type"}
        if not required_keys.issubset(field_config.keys()):
            raise ValueError(f"field_config must contain {required_keys}")

        # Check for duplicate field_name
        field_name = field_config["field_name"]
        if any(f.get("field_name") == field_name for f in self.field_config):
            raise ValueError(f"Field '{field_name}' already exists in category")

        self.field_config.append(field_config)
        self.updated_at = datetime.now(UTC)

    def remove_field(self, field_name: str) -> None:
        """
        Remove a dynamic field from this category.

        Args:
            field_name: Name of field to remove

        Raises:
            ValueError: If field not found
        """
        original_count = len(self.field_config)
        self.field_config = [f for f in self.field_config if f.get("field_name") != field_name]

        if len(self.field_config) == original_count:
            raise ValueError(f"Field '{field_name}' not found in category")

        self.updated_at = datetime.now(UTC)

    def update_field(self, field_name: str, updates: dict[str, object]) -> None:
        """
        Update an existing field configuration.

        Args:
            field_name: Name of field to update
            updates: Dict of field attributes to update

        Raises:
            ValueError: If field not found
        """
        for field in self.field_config:
            if field.get("field_name") == field_name:
                field.update(updates)
                self.updated_at = datetime.now(UTC)
                return

        raise ValueError(f"Field '{field_name}' not found in category")

    def get_field_config(self, field_name: str) -> dict[str, object] | None:
        """
        Get configuration for a specific field.

        Args:
            field_name: Name of field

        Returns:
            Field config dict or None if not found
        """
        for field in self.field_config:
            if field.get("field_name") == field_name:
                return field
        return None

    def update_basic_info(
        self,
        name: str | None = None,
        slug: str | None = None,
        description: str | None = None,
        icon: str | None = None,
        image_url: str | None = None,
    ) -> None:
        """
        Update basic category information.

        Args:
            name: New name (optional)
            slug: New slug (optional)
            description: New description (optional)
            icon: New icon (optional)
            image_url: New image URL (optional)
        """
        if name is not None:
            self.name = name
        if slug is not None:
            self.slug = slug
        if description is not None:
            self.description = description
        if icon is not None:
            self.icon = icon
        if image_url is not None:
            self.image_url = image_url

        self.updated_at = datetime.now(UTC)

    def activate(self) -> None:
        """Activate category (make visible)."""
        if not self.is_active:
            self.is_active = True
            self.updated_at = datetime.now(UTC)

    def deactivate(self) -> None:
        """Deactivate category (hide from UI)."""
        if self.is_active:
            self.is_active = False
            self.updated_at = datetime.now(UTC)

    def set_sort_order(self, sort_order: int) -> None:
        """
        Update sort order.

        Args:
            sort_order: New sort order value
        """
        if sort_order < 0:
            raise ValueError("sort_order must be >= 0")
        self.sort_order = sort_order
        self.updated_at = datetime.now(UTC)

    def validate_attributes(self, attributes: dict[str, Any]) -> None:
        """
        Validate product attributes against this category's attribute_schema.

        Pure domain method — no I/O, no external dependencies.

        Args:
            attributes: Product attribute dict to validate

        Raises:
            ValueError: If required field missing, type mismatch, or options constraint violated

        Note:
            If attribute_schema is empty, all attributes are valid (backward compatible).
        """
        if not self.attribute_schema:
            return  # Empty schema = no constraints

        for field_name, field_def in self.attribute_schema.items():
            required = field_def.get("required", False)
            field_type = field_def.get("type", "string")
            value = attributes.get(field_name)

            if required and value is None:
                raise ValueError(f"Required attribute '{field_name}' is missing")

            if value is not None:
                type_map: dict[str, type | tuple[type, ...]] = {
                    "string": str,
                    "number": (int, float),
                    "boolean": bool,
                }
                expected = type_map.get(field_type)
                if expected and not isinstance(value, expected):
                    raise ValueError(
                        f"Attribute '{field_name}' must be of type {field_type}, "
                        f"got {type(value).__name__}"
                    )
                options = field_def.get("options")
                if options and value not in options:
                    raise ValueError(
                        f"Attribute '{field_name}' must be one of {options}, got '{value}'"
                    )

    @property
    def depth(self) -> int:
        """Get category depth in hierarchy."""
        return self.level

    @property
    def is_root(self) -> bool:
        """Check if this is a root category."""
        return self.parent_id is None
