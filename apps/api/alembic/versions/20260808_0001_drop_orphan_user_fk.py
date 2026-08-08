"""Drop orphan FK constraint fk_product_ownership_user.

Revision ID: 20260808_0001
Revises: 20260804_0001
Create Date: 2026-08-08

The migration 20260706_0002 dropped product_ownership_owner_id_fkey (to orgs),
but a second FK named fk_product_ownership_user (to users) was added later
and never dropped. owner_id can be org, user, or broker UUID — no FK allowed.
"""

from alembic import op

revision = "20260808_0001"
down_revision = "20260804_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ponytail: safe drop — constraint may not exist in fresh DBs
    op.execute("""
        ALTER TABLE product_ownership
        DROP CONSTRAINT IF EXISTS fk_product_ownership_user
    """)


def downgrade() -> None:
    # ponytail: don't restore — this FK was a mistake
    pass
