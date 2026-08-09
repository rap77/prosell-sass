"""Add bot-approved Facebook credential migration authorizations.

Revision ID: 20260809_0001
Revises: 20260808_0002
Create Date: 2026-08-09
"""

import sqlalchemy as sa
from alembic import op

revision = "20260809_0001"
down_revision = "20260808_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fb_credential_migration_authorizations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("pairing_code", sa.String(length=9), nullable=False),
        sa.Column("account_count", sa.Integer(), nullable=False),
        sa.Column("batch_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("approved_by_user_id", sa.UUID(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("migration_token_id", sa.UUID(), nullable=True),
        sa.Column("migration_token_encrypted", sa.LargeBinary(), nullable=True),
        sa.Column("token_delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "account_count >= 1 AND account_count <= 100", name="ck_fb_migration_auth_count"
        ),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["migration_token_id"], ["fb_credential_migration_tokens.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pairing_code"),
    )
    op.create_index(
        "ix_fb_credential_migration_authorizations_batch_fingerprint",
        "fb_credential_migration_authorizations",
        ["batch_fingerprint"],
    )
    op.create_index(
        "ix_fb_credential_migration_authorizations_expires_at",
        "fb_credential_migration_authorizations",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_fb_credential_migration_authorizations_expires_at")
    op.drop_index("ix_fb_credential_migration_authorizations_batch_fingerprint")
    op.drop_table("fb_credential_migration_authorizations")
