"""SQLAlchemy ORM model for Category entity."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class CategoryModel(Base):
    """SQLAlchemy model for categories table."""

    __tablename__ = "categories"

    # Primary fields
    id: Mapped[UUID] = mapped_column(primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
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

    # Dynamic fields configuration
    field_config: Mapped[dict[str, object]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
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
        onupdate="now()",
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
