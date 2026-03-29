"""add_dealers_table

Revision ID: a546709840eb
Revises: 17d9ed732cf9
Create Date: 2026-03-29 08:25:28.425785

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a546709840eb"
down_revision: str | Sequence[str] | None = "17d9ed732cf9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "dealers",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("location_address", sa.String(length=500), nullable=True),
        sa.Column("location_city", sa.String(length=255), nullable=True),
        sa.Column("location_state", sa.String(length=255), nullable=True),
        sa.Column("location_zip", sa.String(length=20), nullable=True),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column("timezone", sa.String(length=50), nullable=False),
        sa.Column("settings", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dealers_tenant_id", "dealers", ["tenant_id"])
    op.create_index("ix_dealers_slug", "dealers", ["slug"])
    op.create_index("ix_dealers_tenant_slug", "dealers", ["tenant_id", "slug"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_dealers_tenant_slug", table_name="dealers")
    op.drop_index("ix_dealers_slug", table_name="dealers")
    op.drop_index("ix_dealers_tenant_id", table_name="dealers")
    op.drop_table("dealers")
