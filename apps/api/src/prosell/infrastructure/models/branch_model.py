"""BranchModel SQLAlchemy ORM."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class BranchModel(Base):
    """SQLAlchemy ORM model for Branch entity."""

    __tablename__ = "branches"

    # Identity
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), index=True, nullable=False)

    # Location
    location_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location_city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location_state: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location_zip: Mapped[str | None] = mapped_column(String(20), nullable=True)
    location_lat: Mapped[float | None] = mapped_column(nullable=True)
    location_lng: Mapped[float | None] = mapped_column(nullable=True)

    # Business
    timezone: Mapped[str] = mapped_column(String(50), default="America/Montevideo")
    settings: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None
    )  # JSON stored as text

    # Audit
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)

    # Indexes and constraints
    __table_args__ = (Index("ix_branches_tenant_slug", "tenant_id", "slug", unique=True),)
