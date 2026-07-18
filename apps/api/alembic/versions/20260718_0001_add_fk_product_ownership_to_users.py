"""Add FK product_ownership.owner_id -> users.id

Revision ID: add_fk_ownership_user
Revises:
Create Date: 2026-07-18

PROP-001: product_ownership now only stores broker shares (owner_type=user).
The organization owner lives in products.organization_id.
This FK prevents orphan ownership records.
"""

from alembic import op

# revision identifiers
revision: str = "20260718_0001"
down_revision: str | None = "20260717_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Clean any orphan records first (defense)
    op.execute("""
        DELETE FROM product_ownership
        WHERE owner_id NOT IN (SELECT id FROM users)
    """)

    # Add FK constraint with CASCADE delete
    op.create_foreign_key(
        "fk_product_ownership_user",
        "product_ownership",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_product_ownership_user",
        "product_ownership",
        type_="foreignkey",
    )
