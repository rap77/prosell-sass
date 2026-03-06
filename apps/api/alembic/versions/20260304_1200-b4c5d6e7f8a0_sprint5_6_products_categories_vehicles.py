"""Sprint 5-6: Products, Categories, Vehicles schema

Revision ID: b4c5d6e7f8a0
Revises: 57b3e7cdea3c
Create Date: 2026-03-04 12:00:00.000000

This migration creates the schema for:
- Categories (hierarchical with dynamic fields)
- Products (with status workflow and flexible attributes)
- Product Images (with ordering and primary selection)
- Vehicles (VIN-based with NHTSA decode cache)
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b4c5d6e7f8a0"
down_revision: str | Sequence[str] | None = "57b3e7cdea3c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""

    # ========================================================================
    # CATEGORIES TABLE
    # Hierarchical categories with dynamic field configuration
    # ========================================================================
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("level", sa.Integer(), server_default="0", nullable=False),
        # Hierarchy
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        # Display
        sa.Column("icon", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        # Organization
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        # Dynamic fields configuration
        sa.Column("field_config", sa.JSON(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Foreign keys
        sa.ForeignKeyConstraint(["tenant_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    # Indexes
    op.create_index(op.f("ix_categories_tenant_id"), "categories", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_categories_name"), "categories", ["name"], unique=False)
    op.create_index(op.f("ix_categories_slug"), "categories", ["slug"], unique=True)
    op.create_index(op.f("ix_categories_parent_id"), "categories", ["parent_id"], unique=False)
    op.create_index(op.f("ix_categories_is_active"), "categories", ["is_active"], unique=False)

    # ========================================================================
    # PRODUCTS TABLE
    # Core product entity with status workflow
    # ========================================================================
    op.create_table(
        "products",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        # Basic info
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("slug", sa.String(length=500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        # Pricing
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="USD", nullable=False),
        # Condition and status
        sa.Column(
            "condition",
            sa.String(length=50),
            server_default="used",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=50),
            server_default="draft",
            nullable=False,
        ),
        # Flexible attributes (category-specific)
        sa.Column("attributes", sa.JSON(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        # Location
        sa.Column("location_city", sa.String(length=100), nullable=True),
        sa.Column("location_state", sa.String(length=100), nullable=True),
        sa.Column("location_zip", sa.String(length=20), nullable=True),
        # Visibility and search
        sa.Column("is_featured", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("view_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("favorite_count", sa.Integer(), server_default="0", nullable=False),
        # Approval workflow
        sa.Column("submitted_for_approval_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_by", sa.Uuid(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", sa.Uuid(), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        # Publication timestamps
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sold_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Foreign keys
        sa.ForeignKeyConstraint(["tenant_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["submitted_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    # Indexes
    op.create_index(op.f("ix_products_tenant_id"), "products", ["tenant_id"], unique=False)
    op.create_index(
        op.f("ix_products_organization_id"), "products", ["organization_id"], unique=False
    )
    op.create_index(op.f("ix_products_category_id"), "products", ["category_id"], unique=False)
    op.create_index(op.f("ix_products_slug"), "products", ["slug"], unique=False)
    op.create_index(op.f("ix_products_status"), "products", ["status"], unique=False)
    op.create_index(op.f("ix_products_condition"), "products", ["condition"], unique=False)
    op.create_index(op.f("ix_products_is_featured"), "products", ["is_featured"], unique=False)

    # ========================================================================
    # PRODUCT IMAGES TABLE
    # Product images with ordering and primary selection
    # ========================================================================
    op.create_table(
        "product_images",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        # Image URLs
        sa.Column("url", sa.String(length=1000), nullable=False),
        sa.Column("thumbnail_url", sa.String(length=1000), nullable=True),
        # Ordering and display
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_primary", sa.Boolean(), server_default="false", nullable=False),
        # Metadata
        sa.Column("alt_text", sa.String(length=500), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        # Upload info
        sa.Column("storage_key", sa.String(length=1000), nullable=True),
        sa.Column("content_type", sa.String(length=100), nullable=True),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Foreign keys
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    # Indexes
    op.create_index(
        op.f("ix_product_images_product_id"), "product_images", ["product_id"], unique=False
    )

    # ========================================================================
    # VEHICLES TABLE
    # Vehicle-specific data with VIN decode cache
    # ========================================================================
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        # VIN
        sa.Column("vin", sa.String(length=17), nullable=False),
        # Basic vehicle info
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("make", sa.String(length=100), nullable=True),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column("trim", sa.String(length=100), nullable=True),
        # Specifications
        sa.Column("body_type", sa.String(length=50), nullable=True),
        sa.Column("body_style", sa.String(length=100), nullable=True),
        sa.Column("drivetrain", sa.String(length=50), nullable=True),
        sa.Column("transmission", sa.String(length=50), nullable=True),
        # Performance
        sa.Column("engine", sa.String(length=200), nullable=True),
        sa.Column("fuel_type", sa.String(length=50), nullable=True),
        sa.Column("mpg_city", sa.Integer(), nullable=True),
        sa.Column("mpg_highway", sa.Integer(), nullable=True),
        sa.Column("mpg_combined", sa.Integer(), nullable=True),
        # Mileage
        sa.Column("mileage", sa.Integer(), nullable=True),
        sa.Column("mileage_unit", sa.String(length=10), server_default="mi", nullable=False),
        # Exterior
        sa.Column("exterior_color", sa.String(length=100), nullable=True),
        sa.Column("interior_color", sa.String(length=100), nullable=True),
        # Features
        sa.Column("has_sunroof", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("has_navigation", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("has_leather", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("has_backup_camera", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("has_bluetooth", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("has_remote_start", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("seat_material", sa.String(length=50), nullable=True),
        # VIN decode data cache
        sa.Column(
            "vin_decoded_data", sa.JSON(), server_default=sa.text("'{}'::jsonb"), nullable=False
        ),
        sa.Column("vin_decoded_at", sa.DateTime(timezone=True), nullable=True),
        # Listing info
        sa.Column("stock_number", sa.String(length=100), nullable=True),
        sa.Column("vin_verified", sa.Boolean(), server_default="false", nullable=False),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Foreign keys
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    # Indexes
    op.create_index(op.f("ix_vehicles_product_id"), "vehicles", ["product_id"], unique=True)
    op.create_index(op.f("ix_vehicles_vin"), "vehicles", ["vin"], unique=True)
    op.create_index(op.f("ix_vehicles_make"), "vehicles", ["make"], unique=False)
    op.create_index(op.f("ix_vehicles_model"), "vehicles", ["model"], unique=False)
    op.create_index(op.f("ix_vehicles_year"), "vehicles", ["year"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""

    # Drop in reverse order of creation
    op.drop_index(op.f("ix_vehicles_year"), table_name="vehicles")
    op.drop_index(op.f("ix_vehicles_model"), table_name="vehicles")
    op.drop_index(op.f("ix_vehicles_make"), table_name="vehicles")
    op.drop_index(op.f("ix_vehicles_vin"), table_name="vehicles")
    op.drop_index(op.f("ix_vehicles_product_id"), table_name="vehicles")
    op.drop_table("vehicles")

    op.drop_index(op.f("ix_product_images_product_id"), table_name="product_images")
    op.drop_table("product_images")

    op.drop_index(op.f("ix_products_is_featured"), table_name="products")
    op.drop_index(op.f("ix_products_condition"), table_name="products")
    op.drop_index(op.f("ix_products_status"), table_name="products")
    op.drop_index(op.f("ix_products_slug"), table_name="products")
    op.drop_index(op.f("ix_products_category_id"), table_name="products")
    op.drop_index(op.f("ix_products_organization_id"), table_name="products")
    op.drop_index(op.f("ix_products_tenant_id"), table_name="products")
    op.drop_table("products")

    op.drop_index(op.f("ix_categories_is_active"), table_name="categories")
    op.drop_index(op.f("ix_categories_parent_id"), table_name="categories")
    op.drop_index(op.f("ix_categories_slug"), table_name="categories")
    op.drop_index(op.f("ix_categories_name"), table_name="categories")
    op.drop_index(op.f("ix_categories_tenant_id"), table_name="categories")
    op.drop_table("categories")
