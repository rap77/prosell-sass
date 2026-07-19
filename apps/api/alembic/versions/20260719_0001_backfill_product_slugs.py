"""Backfill slugs for existing products.

Revision ID: 20260719_0001
Revises: 20260718_0001
Create Date: 2026-07-19

Generates SEO-friendly slugs for products that don't have one.
Format: {slugified-title}-{last-6-chars-of-uuid}
"""

from alembic import op

revision: str = "20260719_0001"
down_revision: str | None = "20260718_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ponytail: pure SQL, no Python loops — one UPDATE touches all rows
    op.execute("""
        UPDATE products
        SET slug = CONCAT(
            TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(title), '[^a-z0-9]+', '-', 'g')),
            '-',
            RIGHT(REPLACE(id::text, '-', ''), 6)
        ),
        updated_at = NOW()
        WHERE slug IS NULL OR slug = ''
    """)


def downgrade() -> None:
    # ponytail: no-op — slugs are harmless to keep
    pass
