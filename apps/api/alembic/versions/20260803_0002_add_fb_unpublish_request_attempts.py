"""Add retry metadata to Facebook unpublish requests.

Revision ID: 20260803_0002
Revises: 20260803_0001
Create Date: 2026-08-03
"""

import sqlalchemy as sa
from alembic import op

revision = "20260803_0002"
down_revision = "20260803_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "fb_unpublish_requests",
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("fb_unpublish_requests", sa.Column("last_error", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("fb_unpublish_requests", "last_error")
    op.drop_column("fb_unpublish_requests", "attempt_count")
