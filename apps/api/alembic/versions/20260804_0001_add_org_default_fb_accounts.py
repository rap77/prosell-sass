"""Add default_fb_account_ids to organizations.

Revision ID: 20260804_0001
Revises: 20260803_0002
Create Date: 2026-08-04
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, UUID

revision = "20260804_0001"
down_revision = "20260803_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ponytail: null = all active accounts, [] = none, [ids] = specific
    op.add_column(
        "organizations",
        sa.Column("default_fb_account_ids", ARRAY(UUID(as_uuid=True)), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizations", "default_fb_account_ids")
