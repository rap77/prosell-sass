"""add_missing_tables_vehicles_products_oauth_sessions

Revision ID: 094a57cf7b48
Revises: 17d9ed732cf9
Create Date: 2026-04-04 14:29:06.057628

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '094a57cf7b48'
down_revision: str | Sequence[str] | None = 'b1c2d3e4f5a6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema - Create all missing tables."""
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
    # PRODUCTS TABLE
    # =========================================================================
    op.create_table(
        "products",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.UUID(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("organization_id", sa.UUID(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("category_id", sa.UUID(), sa.ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("slug", sa.String(500), nullable=True, index=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("price_cents", sa.Integer, nullable=False),
        sa.Column("currency", sa.String(3), server_default="USD", nullable=False),
        sa.Column("condition", sa.String(50), server_default="used", nullable=False, index=True),
        sa.Column("status", sa.String(50), server_default="draft", nullable=False, index=True),
        sa.Column("attributes", sa.JSON, server_default="{}", nullable=False),
        sa.Column("location_city", sa.String(100), nullable=True),
        sa.Column("location_state", sa.String(100), nullable=True),
        sa.Column("location_zip", sa.String(20), nullable=True),
        sa.Column("is_featured", sa.Boolean, server_default="false", nullable=False, index=True),
        sa.Column("view_count", sa.Integer, server_default="0", nullable=False),
        sa.Column("favorite_count", sa.Integer, server_default="0", nullable=False),
        sa.Column("submitted_for_approval_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_by", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sold_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), onupdate=sa.text("now()"), nullable=False),
    )

    # Indexes for products
    op.create_index("ix_products_tenant_id", "products", ["tenant_id"])
    op.create_index("ix_products_organization_id", "products", ["organization_id"])
    op.create_index("ix_products_category_id", "products", ["category_id"])
    op.create_index("ix_products_slug", "products", ["slug"])
    op.create_index("ix_products_status", "products", ["status"])
    op.create_index("ix_products_condition", "products", ["condition"])
    op.create_index("ix_products_is_featured", "products", ["is_featured"])

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

    # =========================================================================
    # SESSIONS TABLE
    # =========================================================================
    op.create_table(
        "sessions",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("token_hash", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # =========================================================================
    # OAUTH ACCOUNTS TABLE
    # =========================================================================
    op.create_table(
        "oauth_accounts",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("provider_user_id", sa.String(255), nullable=False),
        sa.Column("provider_email", sa.String(255), nullable=True),
        sa.Column("access_token", sa.String(500), nullable=True),
        sa.Column("refresh_token", sa.String(500), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), onupdate=sa.text("now()"), nullable=False),
    )

    # =========================================================================
    # FACEBOOK ACCOUNTS TABLE
    # =========================================================================
    op.create_table(
        "facebook_accounts",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("seller_user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("facebook_user_id", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("facebook_name", sa.String(255), nullable=True),
        sa.Column("access_token_encrypted", sa.Text, nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column("scopes", sa.String(1000), server_default="", nullable=False),
        sa.Column("status", sa.String(50), server_default="active", nullable=False, index=True),
        sa.Column("refresh_failure_count", sa.Integer, server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), default=sa.text("now()"), onupdate=sa.text("now()"), nullable=False),
    )

    # =========================================================================
    # FACEBOOK PAGES TABLE
    # =========================================================================
    op.create_table(
        "facebook_pages",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("facebook_account_id", sa.UUID(), sa.ForeignKey("facebook_accounts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("page_id", sa.String(255), nullable=False, index=True),
        sa.Column("page_name", sa.String(255), nullable=False),
        sa.Column("page_access_token_encrypted", sa.Text, nullable=False),
        sa.Column("category", sa.String(255), nullable=True),
        sa.Column("picture_url", sa.String(500), nullable=True),
        sa.Column("is_default", sa.Boolean, server_default="false", nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), default=sa.text("now()"), onupdate=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema - Drop all created tables."""
    # Drop indexes first
    op.drop_index("ix_products_is_featured", table_name="products")
    op.drop_index("ix_products_condition", table_name="products")
    op.drop_index("ix_products_status", table_name="products")
    op.drop_index("ix_products_slug", table_name="products")
    op.drop_index("ix_products_category_id", table_name="products")
    op.drop_index("ix_products_organization_id", table_name="products")
    op.drop_index("ix_products_tenant_id", table_name="products")

    # Drop tables in reverse dependency order
    op.drop_table("facebook_pages")
    op.drop_table("facebook_accounts")
    op.drop_table("oauth_accounts")
    op.drop_table("sessions")
    op.drop_table("vehicles")
    op.drop_table("product_images")
    op.drop_table("products")
    op.drop_table("categories")
