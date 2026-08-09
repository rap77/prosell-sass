"""Bind Facebook credential migration tokens to approved batch summaries.

Revision ID: 20260809_0002
Revises: 20260809_0001
Create Date: 2026-08-09
"""

import sqlalchemy as sa
from alembic import op

revision = "20260809_0002"
down_revision = "20260809_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "fb_credential_migration_tokens", sa.Column("account_count", sa.Integer(), nullable=True)
    )
    op.add_column(
        "fb_credential_migration_tokens",
        sa.Column("batch_fingerprint", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("fb_credential_migration_tokens", "batch_fingerprint")
    op.drop_column("fb_credential_migration_tokens", "account_count")
