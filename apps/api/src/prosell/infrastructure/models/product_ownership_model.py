"""SQLAlchemy ORM model for the product_ownership M2M table.

Multi-owner support for any product type. A product can have N owners
(organizations/brokers) with percentage shares that must sum to 100%.

The composite primary key is (product_id, owner_id). Both FKs cascade
on delete so removing a product or organization cleans up ownership rows.
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class ProductOwnershipModel(Base):
    """SQLAlchemy model for the `product_ownership` table."""

    __tablename__ = "product_ownership"

    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
    )
    owner_id: Mapped[UUID] = mapped_column(
        # ponytail: no FK constraint — owner_id can be org OR user UUID
        primary_key=True,
    )
    # Discriminator: "organization" | "user"
    owner_type: Mapped[str] = mapped_column(
        String(20),
        default="organization",
        nullable=False,
    )
    percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        default=Decimal("100.00"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
