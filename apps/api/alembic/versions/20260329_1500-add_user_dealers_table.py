"""add_user_dealers_table

Revision ID: b1c2d3e4f5a6
Revises: a546709840eb
Create Date: 2026-03-29 15:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: str | Sequence[str] | None = "b53d13201dcb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user_dealers",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("dealer_id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("assigned_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_user_dealers_user_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["dealer_id"],
            ["dealers.id"],
            name="fk_user_dealers_dealer_id_dealers",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_by"],
            ["users.id"],
            name="fk_user_dealers_assigned_by_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_dealers_user_id", "user_dealers", ["user_id"], if_not_exists=True)
    op.create_index("ix_user_dealers_dealer_id", "user_dealers", ["dealer_id"], if_not_exists=True)
    op.create_index(
        "ix_user_dealers_user_dealer",
        "user_dealers",
        ["user_id", "dealer_id"],
        unique=True,
        if_not_exists=True,
    )
    op.create_index("ix_user_dealers_tenant", "user_dealers", ["tenant_id"], if_not_exists=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_user_dealers_tenant", table_name="user_dealers")
    op.drop_index("ix_user_dealers_user_dealer", table_name="user_dealers")
    op.drop_index("ix_user_dealers_dealer_id", table_name="user_dealers")
    op.drop_index("ix_user_dealers_user_id", table_name="user_dealers")
    op.drop_table("user_dealers")
