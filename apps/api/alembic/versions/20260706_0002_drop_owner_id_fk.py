"""Drop FK constraint on product_ownership.owner_id.

Revision ID: drop_owner_id_fk_20260706
Revises: add_brokers_20260706
Create Date: 2026-07-06

owner_id can now be either an organization UUID or a user UUID,
so we remove the FK constraint to organizations table.
"""

from alembic import op

revision = "drop_owner_id_fk_20260706"
down_revision = "add_brokers_20260706"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "product_ownership_owner_id_fkey",
        "product_ownership",
        type_="foreignkey",
    )


def downgrade() -> None:
    op.create_foreign_key(
        "product_ownership_owner_id_fkey",
        "product_ownership",
        "organizations",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )
