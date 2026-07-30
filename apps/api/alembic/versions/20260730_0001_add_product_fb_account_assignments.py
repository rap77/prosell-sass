"""Add product_fb_account_assignments table.

Revision ID: 20260730_0001
Revises: 20260729_0001
Create Date: 2026-07-30
"""

import sqlalchemy as sa
from alembic import op

revision = "20260730_0001"
down_revision = "20260729_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_fb_account_assignments",
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("fb_account_id", sa.UUID(), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("product_id", "fb_account_id"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["fb_account_id"], ["fb_accounts.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_product_fb_account_assignments_product_id",
        "product_fb_account_assignments",
        ["product_id"],
    )
    op.create_index(
        "ix_product_fb_account_assignments_fb_account_id",
        "product_fb_account_assignments",
        ["fb_account_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_product_fb_account_assignments_fb_account_id")
    op.drop_index("ix_product_fb_account_assignments_product_id")
    op.drop_table("product_fb_account_assignments")
