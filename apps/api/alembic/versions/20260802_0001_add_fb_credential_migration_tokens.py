"""Add approved Facebook credential migration tokens.

Revision ID: 20260802_0001
Revises: 20260801_0001
Create Date: 2026-08-02
"""

import sqlalchemy as sa
from alembic import op

revision = "20260802_0001"
down_revision = "20260801_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "fb_accounts",
        sa.Column("credential_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("fb_accounts", sa.Column("migration_token_id", sa.UUID(), nullable=True))
    op.create_table(
        "fb_credential_migration_tokens",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_fb_credential_migration_tokens_expires_at",
        "fb_credential_migration_tokens",
        ["expires_at"],
    )
    op.create_index("ix_fb_accounts_migration_token_id", "fb_accounts", ["migration_token_id"])
    op.create_foreign_key(
        "fk_fb_accounts_migration_token_id",
        "fb_accounts",
        "fb_credential_migration_tokens",
        ["migration_token_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_fb_credential_migration_tokens_tenant_id",
        "fb_credential_migration_tokens",
        ["tenant_id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_fb_accounts_migration_token_id", "fb_accounts", type_="foreignkey")
    op.drop_index("ix_fb_accounts_migration_token_id")
    op.drop_index("ix_fb_credential_migration_tokens_tenant_id")
    op.drop_index("ix_fb_credential_migration_tokens_expires_at")
    op.drop_table("fb_credential_migration_tokens")
    op.drop_column("fb_accounts", "migration_token_id")
    op.drop_column("fb_accounts", "credential_verified_at")
