"""SQLAlchemy ORM model for Product entity."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class ProductModel(Base):
    """SQLAlchemy model for products table."""

    __tablename__ = "products"

    # Primary fields
    id: Mapped[UUID] = mapped_column(primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Basic info
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str | None] = mapped_column(String(500), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Pricing
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    # Condition and status
    condition: Mapped[str] = mapped_column(String(50), default="used", nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False, index=True)

    # Flexible attributes (category-specific) — JSONB with GIN index
    # GIN index enables efficient @> (contains) and ? (key exists) operators
    attributes: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )

    # Image URLs at product level (moved from VehicleAttributes)
    image_urls: Mapped[list[str] | None] = mapped_column(
        JSONB,
        default=[],
        nullable=True,
    )

    # Location
    location_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_zip: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Visibility and search
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    favorite_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Approval workflow
    submitted_for_approval_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    submitted_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    approved_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Publication timestamps
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    sold_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )

    # Indexes for JSONB queries
    # GIN index with jsonb_path_ops supports @> operator efficiently
    __table_args__ = (
        Index(
            "ix_products_attributes_gin",
            "attributes",
            postgresql_using="gin",
            postgresql_ops={"attributes": "jsonb_path_ops"},
        ),
    )

    # Relationships
    category = relationship(
        "CategoryModel",
        back_populates="products",
        lazy="noload",
    )
    images = relationship(
        "ProductImageModel",
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    # Organization ref (for query convenience, not a FK relationship)
    organization = relationship(
        "OrganizationModel",
        foreign_keys=[organization_id],
        lazy="noload",
    )
    # Tenant ref
    tenant = relationship(
        "OrganizationModel",
        foreign_keys=[tenant_id],
        lazy="noload",
    )
