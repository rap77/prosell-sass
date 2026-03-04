"""SQLAlchemy ORM model for Vehicle entity."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class VehicleModel(Base):
    """SQLAlchemy model for vehicles table."""

    __tablename__ = "vehicles"

    # Primary fields
    id: Mapped[UUID] = mapped_column(primary_key=True)
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # VIN
    vin: Mapped[str] = mapped_column(String(17), nullable=False, unique=True, index=True)

    # Basic vehicle info
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    make: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    trim: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Specifications
    body_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    body_style: Mapped[str | None] = mapped_column(String(100), nullable=True)
    drivetrain: Mapped[str | None] = mapped_column(String(50), nullable=True)
    transmission: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Performance
    engine: Mapped[str | None] = mapped_column(String(200), nullable=True)
    fuel_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mpg_city: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mpg_highway: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mpg_combined: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Mileage
    mileage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mileage_unit: Mapped[str] = mapped_column(String(10), default="mi", nullable=False)

    # Exterior
    exterior_color: Mapped[str | None] = mapped_column(String(100), nullable=True)
    interior_color: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Features
    has_sunroof: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_navigation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_leather: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_backup_camera: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_bluetooth: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_remote_start: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    seat_material: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # VIN decode data cache
    vin_decoded_data: Mapped[dict[str, str]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    vin_decoded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Listing info
    stock_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vin_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

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
    product = relationship(
        "ProductModel",
        back_populates="vehicle",
        lazy="noload",
    )
