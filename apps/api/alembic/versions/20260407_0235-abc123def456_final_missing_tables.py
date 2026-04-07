"""final_missing_tables_vehicles_categories_product_images

Revision ID: abc123def456
Revises: b1c2d3e4f5a6
Create Date: 2026-04-07 02:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abc123def456'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Create missing tables with IF NOT EXISTS."""
    # =========================================================================
    # CATEGORIES TABLE (if not exists)
    # =========================================================================
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL UNIQUE,
            level INTEGER DEFAULT 0 NOT NULL,
            parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
            icon VARCHAR(100),
            description TEXT,
            image_url VARCHAR(500),
            sort_order INTEGER DEFAULT 0 NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            field_config JSON DEFAULT '[]' NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
    """))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_categories_tenant_id ON categories(tenant_id);"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_categories_name ON categories(name);"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_categories_slug ON categories(slug);"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_categories_parent_id ON categories(parent_id);"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_categories_is_active ON categories(is_active);"))

    # =========================================================================
    # PRODUCT IMAGES TABLE
    # =========================================================================
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS product_images (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            url VARCHAR(1000) NOT NULL,
            thumbnail_url VARCHAR(1000),
            sort_order INTEGER DEFAULT 0 NOT NULL,
            is_primary BOOLEAN DEFAULT false NOT NULL,
            alt_text VARCHAR(500),
            width INTEGER,
            height INTEGER,
            file_size_bytes INTEGER,
            storage_key VARCHAR(1000),
            content_type VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
    """))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_product_images_product_id ON product_images(product_id);"))

    # =========================================================================
    # VEHICLES TABLE
    # =========================================================================
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS vehicles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
            vin VARCHAR(17) NOT NULL UNIQUE,
            year INTEGER,
            make VARCHAR(100),
            model VARCHAR(100),
            trim VARCHAR(100),
            body_type VARCHAR(50),
            body_style VARCHAR(100),
            drivetrain VARCHAR(50),
            transmission VARCHAR(50),
            engine VARCHAR(200),
            fuel_type VARCHAR(50),
            mpg_city INTEGER,
            mpg_highway INTEGER,
            mpg_combined INTEGER,
            mileage INTEGER,
            mileage_unit VARCHAR(10) DEFAULT 'mi' NOT NULL,
            exterior_color VARCHAR(100),
            interior_color VARCHAR(100),
            has_sunroof BOOLEAN DEFAULT false NOT NULL,
            has_navigation BOOLEAN DEFAULT false NOT NULL,
            has_leather BOOLEAN DEFAULT false NOT NULL,
            has_backup_camera BOOLEAN DEFAULT false NOT NULL,
            has_bluetooth BOOLEAN DEFAULT false NOT NULL,
            has_remote_start BOOLEAN DEFAULT false NOT NULL,
            seat_material VARCHAR(50),
            vin_decoded_data JSON DEFAULT '{}' NOT NULL,
            vin_decoded_at TIMESTAMPTZ,
            stock_number VARCHAR(100),
            vin_verified BOOLEAN DEFAULT false NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
    """))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_vehicles_product_id ON vehicles(product_id);"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_vehicles_vin ON vehicles(vin);"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_vehicles_make ON vehicles(make);"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_vehicles_model ON vehicles(model);"))


def downgrade() -> None:
    """Downgrade schema - Drop created tables (if they exist)."""
    # Drop indexes first
    op.execute(sa.text("DROP INDEX IF EXISTS ix_vehicles_model;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_vehicles_make;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_vehicles_vin;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_vehicles_product_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_product_images_product_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_categories_tenant_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_categories_name;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_categories_slug;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_categories_parent_id;"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_categories_is_active;"))
    
    # Drop tables
    op.execute(sa.text("DROP TABLE IF EXISTS vehicles;"))
    op.execute(sa.text("DROP TABLE IF EXISTS product_images;"))
    op.execute(sa.text("DROP TABLE IF EXISTS categories;"))
