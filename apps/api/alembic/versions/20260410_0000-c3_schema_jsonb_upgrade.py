"""c3_schema_jsonb_upgrade

Revision ID: c3schema001
Revises: abc123def456
Create Date: 2026-04-10 00:00:00.000000

MIGRATION NOTES:
- This migration upgrades JSON columns to JSONB for JSONB operator support (@>, ?, #>>)
- JSON -> JSONB cast is lossless for all valid JSON data
- Exception: JSONB silently deduplicates JSON keys with same name (JSON allows duplicates)
  Pre-flight: run pytest tests/integration/test_migration_c3.py
    ::test_preflight_no_duplicate_json_keys_in_products_attributes
  This test verifies no duplicate JSON keys exist before migration
  (JSONB deduplicates them silently)
- GIN indexes use plain CREATE INDEX (not CONCURRENTLY) -- runs inside transaction
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'c3schema001'
down_revision: str | Sequence[str] | None = '504440751584'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add attribute_schema to categories, upgrade JSON -> JSONB on attributes/field_config."""

    # Step 1: Add attribute_schema column to categories
    # This column is the C3 API validation schema (object format, JSONB)
    # Different from field_config (array format, UI renderer)
    op.add_column(
        'categories',
        sa.Column(
            'attribute_schema',
            JSONB(),
            server_default='{}',
            nullable=False,
        )
    )

    # Step 2: Upgrade products.attributes JSON -> JSONB
    # lossless: all valid JSON is valid JSONB
    op.execute(
        "ALTER TABLE products ALTER COLUMN attributes TYPE JSONB "
        "USING attributes::text::jsonb"
    )

    # Step 3: Upgrade categories.field_config JSON -> JSONB
    op.execute(
        "ALTER TABLE categories ALTER COLUMN field_config TYPE JSONB "
        "USING field_config::text::jsonb"
    )

    # Step 4: GIN indexes for JSONB operator performance
    # Note: NOT using CONCURRENTLY -- cannot run inside Alembic transaction
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_categories_attribute_schema_gin "
        "ON categories USING gin(attribute_schema)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_products_attributes_gin "
        "ON products USING gin(attributes)"
    )


def downgrade() -> None:
    """Reverse: drop GIN indexes, revert JSONB -> JSON, drop attribute_schema column."""
    # Drop GIN indexes first
    op.execute("DROP INDEX IF EXISTS ix_products_attributes_gin;")
    op.execute("DROP INDEX IF EXISTS ix_categories_attribute_schema_gin;")

    # Revert JSONB -> JSON (lossless roundtrip)
    op.execute(
        "ALTER TABLE products ALTER COLUMN attributes TYPE JSON "
        "USING attributes::text::json"
    )
    op.execute(
        "ALTER TABLE categories ALTER COLUMN field_config TYPE JSON "
        "USING field_config::text::json"
    )

    # Drop attribute_schema column
    op.drop_column('categories', 'attribute_schema')
