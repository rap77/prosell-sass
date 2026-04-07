"""add_vehicles_categories_product_images_tables

Revision ID: 1e5447840509
Revises: b1c2d3e4f5a6
Create Date: 2026-04-07 02:34:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e5447840509'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Create missing tables (vehicles, categories, product_images)."""
    # =========================================================================
    # CATEGORIES TABLE
    # =========================================================================
    op.create_table(
        "categories",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.UUID(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False, index=True),
        sa.Column("slug", sa.String(255), nullable=False, unique=True),
        sa.Column("level", sa.Integer, server_default="0", nullable=False),
        sa.Column("parent_id", sa.UUID(), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("icon", sa.String(100), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("sort_order", sa.Integer, server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean, server_default="true", nullable=False, index=True),
        sa.Column("field_config", sa.JSON, server_default="[]", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), onupdate=sa.text("now()"), nullable=False),
    )

    # =========================================================================
    # PRODUCT IMAGES TABLE
    # =========================================================================
    op.create_table(
        "product_images",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("product_id", sa.UUID(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("thumbnail_url", sa.String(1000), nullable=True),
        sa.Column("sort_order", sa.Integer, server_default="0", nullable=False),
        sa.Column("is_primary", sa.Boolean, server_default="false", nullable=False),
        sa.Column("alt_text", sa.String(500), nullable=True),
        sa.Column("width", sa.Integer, nullable=True),
        sa.Column("height", sa.Integer, nullable=True),
        sa.Column("file_size_bytes", sa.Integer, nullable=True),
        sa.Column("storage_key", sa.String(1000), nullable=True),
        sa.Column("content_type", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), onupdate=sa.text("now()"), nullable=False),
    )

    # =========================================================================
    # VEHICLES TABLE
    # =========================================================================
    op.create_table(
        "vehicles",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("product_id", sa.UUID(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("vin", sa.String(17), nullable=False, unique=True, index=True),
        sa.Column("year", sa.Integer, nullable=True),
        sa.Column("make", sa.String(100), nullable=True, index=True),
        sa.Column("model", sa.String(100), nullable=True, index=True),
        sa.Column("trim", sa.String(100), nullable=True),
        sa.Column("body_type", sa.String(50), nullable=True),
        sa.Column("body_style", sa.String(100), nullable=True),
        sa.Column("drivetrain", sa.String(50), nullable=True),
        sa.Column("transmission", sa.String(50), nullable=True),
        sa.Column("engine", sa.String(200), nullable=True),
        sa.Column("fuel_type", sa.String(50), nullable=True),
        sa.Column("mpg_city", sa.Integer, nullable=True),
        sa.Column("mpg_highway", sa.Integer, nullable=True),
        sa.Column("mpg_combined", sa.Integer, nullable=True),
        sa.Column("mileage", sa.Integer, nullable=True),
        sa.Column("mileage_unit", sa.String(10), server_default="mi", nullable=False),
        sa.Column("exterior_color", sa.String(100), nullable=True),
        sa.Column("interior_color", sa.String(100), nullable=True),
        sa.Column("has_sunroof", sa.Boolean, server_default="false", nullable=False),
        sa.Column("has_navigation", sa.Boolean, server_default="false", nullable=False),
        sa.Column("has_leather", sa.Boolean, server_default="false", nullable=False),
        sa.Column("has_backup_camera", sa.Boolean, server_default="false", nullable=False),
        sa.Column("has_bluetooth", sa.Boolean, server_default="false", nullable=False),
        sa.Column("has_remote_start", sa.Boolean, server_default="false", nullable=False),
        sa.Column("seat_material", sa.String(50), nullable=True),
        sa.Column("vin_decoded_data", sa.JSON, server_default="{}", nullable=False),
        sa.Column("vin_decoded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stock_number", sa.String(100), nullable=True),
        sa.Column("vin_verified", sa.Boolean, server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), onupdate=sa.text("now()"), nullable=False),
    )

    # Indexes for vehicles
    op.create_index("ix_vehicles_product_id", "vehicles", ["product_id"])
    op.create_index("ix_vehicles_vin", "vehicles", ["vin"])
    op.create_index("ix_vehicles_make", "vehicles", ["make"])
    op.create_index("ix_vehicles_model", "vehicles", ["model"])


def downgrade() -> None:
    """Downgrade schema - Drop created tables."""
    # Drop indexes first
    op.drop_index("ix_vehicles_model", table_name="vehicles")
    op.drop_index("ix_vehicles_make", table_name="vehicles")
    op.drop_index("ix_vehicles_vin", table_name="vehicles")
    op.drop_index("ix_vehicles_product_id", table_name="vehicles")
    
    # Drop tables
    op.drop_table("vehicles")
    op.drop_table("product_images")
    op.drop_table("categories")
