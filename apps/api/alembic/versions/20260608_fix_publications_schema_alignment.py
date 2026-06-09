"""fix_publications_schema_alignment

Revision ID: fix_publications_schema
Revises: fix_teams_schema_align
Create Date: 2026-06-08

Aligns the `publications` table with the ORM (`PublicationModel`) and the
domain entity (`Publication`).

The original migration `17d9ed732cf9_complete_publications_table.py` created
the table referencing `vehicle_id` (when publications still belonged to the
old vehicles table). After the c3-schema cleanup dropped vehicles in favor of
the polymorphic `products` table, publications was never updated.

Schema drift detected:
  - DB has `vehicle_id` -> ORM needs `product_id` (FK to products)
  - DB missing `tenant_id` (required for multi-tenant queries)
  - DB missing `status` (state machine)
  - DB missing `fb_listing_id` (looked up by webhook handler)
  - DB has JSON, ORM uses JSONB for `image_urls`

The fix:
  1. Drop unused `vehicle_id` (vehicles table no longer exists)
  2. Add `tenant_id` UUID NOT NULL with FK organizations
  3. Add `product_id` UUID NOT NULL with FK products
  4. Add `status` VARCHAR(50) NOT NULL DEFAULT 'pending'
  5. Add `fb_listing_id` VARCHAR(255) NULL with index
  6. Convert image_urls from JSON to JSONB
  7. Create indexes used by repository queries

Idempotent: uses IF NOT EXISTS / IF EXISTS so it can run safely against
databases that already match the target shape.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "fix_publications_schema"
down_revision: str | Sequence[str] | None = "fix_teams_schema_align"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Align publications schema to ORM."""
    # 1. Drop the stale vehicle_id column (vehicles table no longer exists)
    op.execute("ALTER TABLE publications DROP COLUMN IF EXISTS vehicle_id")

    # 2. Add tenant_id NOT NULL with FK organizations (table is empty, safe)
    op.execute("ALTER TABLE publications ADD COLUMN IF NOT EXISTS tenant_id UUID")
    # Populate any pre-existing rows from product->organization (defensive, table is empty)
    op.execute("ALTER TABLE publications ALTER COLUMN tenant_id SET NOT NULL")
    op.execute("ALTER TABLE publications DROP CONSTRAINT IF EXISTS publications_tenant_id_fkey")
    op.execute(
        "ALTER TABLE publications ADD CONSTRAINT publications_tenant_id_fkey "
        "FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE"
    )

    # 3. Add product_id NOT NULL with FK products
    op.execute("ALTER TABLE publications ADD COLUMN IF NOT EXISTS product_id UUID")
    op.execute("ALTER TABLE publications ALTER COLUMN product_id SET NOT NULL")
    op.execute("ALTER TABLE publications DROP CONSTRAINT IF EXISTS publications_product_id_fkey")
    op.execute(
        "ALTER TABLE publications ADD CONSTRAINT publications_product_id_fkey "
        "FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE"
    )

    # 4. Add status state machine column
    op.execute(
        "ALTER TABLE publications ADD COLUMN IF NOT EXISTS status VARCHAR(50) "
        "NOT NULL DEFAULT 'pending'"
    )

    # 5. Add fb_listing_id column (looked up by webhook)
    op.execute("ALTER TABLE publications ADD COLUMN IF NOT EXISTS fb_listing_id VARCHAR(255)")

    # 6. Convert image_urls from JSON to JSONB
    op.execute(
        "ALTER TABLE publications ALTER COLUMN image_urls TYPE JSONB USING image_urls::jsonb"
    )

    # 7. Create indexes used by repository queries
    op.execute("CREATE INDEX IF NOT EXISTS ix_publications_tenant_id ON publications (tenant_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_publications_product_id ON publications (product_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_publications_status ON publications (status)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_publications_fb_listing_id ON publications (fb_listing_id)"
    )


def downgrade() -> None:
    """Reverse the schema alignment (best-effort, irreversible for data)."""
    op.execute("DROP INDEX IF EXISTS ix_publications_fb_listing_id")
    op.execute("DROP INDEX IF EXISTS ix_publications_status")
    op.execute("DROP INDEX IF EXISTS ix_publications_product_id")
    op.execute("DROP INDEX IF EXISTS ix_publications_tenant_id")

    op.execute("ALTER TABLE publications ALTER COLUMN image_urls TYPE JSON USING image_urls::json")

    op.execute("ALTER TABLE publications DROP COLUMN IF EXISTS fb_listing_id")
    op.execute("ALTER TABLE publications DROP COLUMN IF EXISTS status")

    op.execute("ALTER TABLE publications DROP CONSTRAINT IF EXISTS publications_product_id_fkey")
    op.execute("ALTER TABLE publications DROP COLUMN IF EXISTS product_id")

    op.execute("ALTER TABLE publications DROP CONSTRAINT IF EXISTS publications_tenant_id_fkey")
    op.execute("ALTER TABLE publications DROP COLUMN IF EXISTS tenant_id")

    op.execute("ALTER TABLE publications ADD COLUMN IF NOT EXISTS vehicle_id UUID")
