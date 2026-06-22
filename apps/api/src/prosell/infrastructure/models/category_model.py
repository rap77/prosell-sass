"""SQLAlchemy ORM model for Category entity."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class CategoryModel(Base):
    """SQLAlchemy model for categories table."""

    __tablename__ = "categories"

    # Primary fields
    id: Mapped[UUID] = mapped_column(primary_key=True)
    # Nullable since Plan 2: root verticals (level 0) are global templates
    # shared by every organization. Tenant-scoped categories still carry
    # their tenant_id. Index kept — every per-tenant query still filters
    # by it, and the few global rows sit in the same B-tree.
    tenant_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    level: Mapped[int] = mapped_column(default=0, nullable=False)

    # Hierarchy
    parent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Display
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Organization
    sort_order: Mapped[int] = mapped_column(default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    # Dynamic fields configuration (UI field renderer — array of field descriptors)
    field_config: Mapped[list[dict[str, object]]] = mapped_column(
        JSONB,
        default=list,
        nullable=False,
    )

    # C3 schema: API validation schema for product attributes in this category
    # Format: {"field_name": {"type": "string|number|boolean", "required": bool, "options": [...]}}
    # Different from field_config (UI renderer) — this drives data validation
    attribute_schema: Mapped[dict[str, dict[str, object]]] = mapped_column(
        JSONB,
        server_default="{}",
        nullable=False,
    )

    # Presentation contract (display templates + card fields). Nullable —
    # categories without one inherit from an ancestor or fall back to the
    # request title. See Category entity + template_composer.
    presentation: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        # Use the SQL function clause, NOT the string "now()". A plain
        # string is bound as a literal value, so asyncpg receives the
        # text "now()" where a datetime is expected and raises DataError
        # on every category UPDATE. `func.now()` emits real SQL.
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    # Self-referential for parent-child
    parent = relationship(
        "CategoryModel",
        back_populates="children",
        remote_side="CategoryModel.id",
        lazy="noload",
    )
    children = relationship(
        "CategoryModel",
        back_populates="parent",
        lazy="noload",
    )
    # Products in this category
    products = relationship(
        "ProductModel",
        back_populates="category",
        lazy="noload",
    )
